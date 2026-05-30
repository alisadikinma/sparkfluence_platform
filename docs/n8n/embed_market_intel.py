#!/usr/bin/env python3
"""
TIER 3 Market Intelligence Embedder for Sparkfluence RAG

This script processes the market intelligence knowledge file, chunks it by section,
generates Gemini embeddings (FREE), and uploads to Supabase for semantic search.

TIER 3 Content includes:
- Trending topics per niche (Indonesia & India)
- Industry statistics and facts
- Viral video case studies
- Proven hook formulas
- Cultural context and localization

Usage:
  python embed_market_intel.py --file "path/to/market_intel.md"
  python embed_market_intel.py --file "path/to/market_intel.md" --dry-run
  python embed_market_intel.py --file "path/to/market_intel.md" --clear-existing

Environment Variables:
  - GEMINI_API_KEY: Your Google AI API key
  - SUPABASE_URL: Your Supabase project URL
  - SUPABASE_SERVICE_KEY: Your Supabase service role key

Dependencies:
  pip install google-generativeai python-dotenv httpx
"""

import os
import sys
import argparse
import time
import re
import json
from pathlib import Path
from typing import List, Dict, Optional, Tuple
from dataclasses import dataclass
from dotenv import load_dotenv

try:
    import google.generativeai as genai
    import httpx
except ImportError as e:
    print(f"❌ Error: Missing required dependency: {e}")
    print("Please install dependencies:")
    print("  pip install google-generativeai python-dotenv httpx")
    sys.exit(1)

# Load environment variables
load_dotenv()

# Constants
EMBEDDING_MODEL = "models/text-embedding-004"
EMBEDDING_DIMENSION = 768
PROJECT_TYPE = "market_intel"  # TIER 3 project type

# Chunking parameters - optimized for market intelligence content
TARGET_CHUNK_SIZE = 800  # characters (smaller for better precision)
MAX_CHUNK_SIZE = 1200    # hard limit
CHUNK_OVERLAP = 100      # characters overlap between chunks

# Rate limiting
EMBEDDING_DELAY = 0.15   # seconds between API calls (avoid rate limit)
MAX_RETRIES = 3
RETRY_DELAY = 2


@dataclass
class Chunk:
    """Represents a text chunk with metadata"""
    title: str
    text: str
    char_count: int
    part_number: int = 1
    total_parts: int = 1
    metadata: Dict = None
    embedding: List[float] = None
    
    def __post_init__(self):
        if self.metadata is None:
            self.metadata = {}


class SupabaseClient:
    """Lightweight Supabase client using httpx (no heavy dependencies)"""
    
    def __init__(self, url: str, key: str):
        self.url = url.rstrip('/')
        self.headers = {
            'apikey': key,
            'Authorization': f'Bearer {key}',
            'Content-Type': 'application/json',
            'Prefer': 'return=representation'
        }
        self.client = httpx.Client(timeout=60.0)
    
    def insert(self, table: str, records: List[Dict]) -> Dict:
        """Insert records into a table"""
        url = f"{self.url}/rest/v1/{table}"
        response = self.client.post(url, headers=self.headers, json=records)
        
        # Get detailed error if failed
        if response.status_code >= 400:
            try:
                error_detail = response.json()
                print(f"      Supabase error: {json.dumps(error_detail, indent=2)}")
            except:
                print(f"      Response: {response.text[:500]}")
            response.raise_for_status()
        
        return response.json()
    
    def delete(self, table: str, filters: Dict) -> Dict:
        """Delete records from a table with filters"""
        url = f"{self.url}/rest/v1/{table}"
        
        # Build query params from filters
        params = []
        for key, value in filters.items():
            params.append(f"{key}=eq.{value}")
        
        if params:
            url += "?" + "&".join(params)
        
        response = self.client.delete(url, headers=self.headers)
        
        # Get detailed error if failed
        if response.status_code >= 400:
            try:
                error_detail = response.json()
                print(f"      Supabase delete error: {json.dumps(error_detail, indent=2)}")
            except:
                pass
            response.raise_for_status()
        
        # Return empty list if no content
        if response.status_code == 204:
            return []
        return response.json()
    
    def close(self):
        """Close the HTTP client"""
        self.client.close()


class MarketIntelEmbedder:
    """
    Specialized embedder for TIER 3 market intelligence content.
    Chunks by semantic sections (## headers) with smart splitting.
    """

    def __init__(self, gemini_key: str, supabase_url: str, supabase_key: str):
        """Initialize API clients"""
        genai.configure(api_key=gemini_key)
        self.supabase = SupabaseClient(supabase_url, supabase_key)
        self.stats = {
            'sections_found': 0,
            'chunks_created': 0,
            'embeddings_generated': 0,
            'rows_uploaded': 0,
            'errors': []
        }

    def read_file(self, file_path: Path) -> str:
        """Read markdown file content"""
        try:
            with open(file_path, 'r', encoding='utf-8') as f:
                return f.read()
        except Exception as e:
            raise Exception(f"Failed to read {file_path}: {e}")

    def extract_sections(self, content: str) -> List[Dict[str, str]]:
        """
        Extract sections from markdown based on ## and ### headers.
        Returns list of sections with hierarchy preserved in title.
        """
        sections = []
        
        # Pattern for ## and ### headers
        header_pattern = r'^(#{2,3})\s+(.+)$'
        
        lines = content.split('\n')
        current_h2 = "Introduction"
        current_section = []
        current_h3 = None
        
        for line in lines:
            header_match = re.match(header_pattern, line)
            
            if header_match:
                # Save previous section if exists
                if current_section:
                    section_title = f"{current_h2}"
                    if current_h3:
                        section_title = f"{current_h2} > {current_h3}"
                    
                    section_text = '\n'.join(current_section).strip()
                    if section_text:
                        sections.append({
                            'title': section_title,
                            'text': section_text,
                            'h2': current_h2,
                            'h3': current_h3
                        })
                    current_section = []
                
                # Determine header level
                level = len(header_match.group(1))
                header_text = header_match.group(2).strip()
                
                if level == 2:
                    current_h2 = header_text
                    current_h3 = None
                elif level == 3:
                    current_h3 = header_text
            else:
                # Skip horizontal rules and empty lines at section start
                if line.strip() == '---':
                    continue
                current_section.append(line)
        
        # Save final section
        if current_section:
            section_title = f"{current_h2}"
            if current_h3:
                section_title = f"{current_h2} > {current_h3}"
            
            section_text = '\n'.join(current_section).strip()
            if section_text:
                sections.append({
                    'title': section_title,
                    'text': section_text,
                    'h2': current_h2,
                    'h3': current_h3
                })
        
        self.stats['sections_found'] = len(sections)
        return sections

    def smart_split_text(self, text: str, max_size: int) -> List[str]:
        """
        Split text intelligently by:
        1. Paragraphs (double newline)
        2. Sentences
        3. Hard character limit as fallback
        """
        if len(text) <= max_size:
            return [text]
        
        chunks = []
        
        # Try splitting by paragraphs first
        paragraphs = re.split(r'\n\n+', text)
        current_chunk = ""
        
        for para in paragraphs:
            para = para.strip()
            if not para:
                continue
                
            test_chunk = f"{current_chunk}\n\n{para}".strip() if current_chunk else para
            
            if len(test_chunk) <= max_size:
                current_chunk = test_chunk
            else:
                # Save current chunk if exists
                if current_chunk:
                    chunks.append(current_chunk)
                
                # If single paragraph is too long, split by sentences
                if len(para) > max_size:
                    sentences = re.split(r'(?<=[.!?])\s+', para)
                    sentence_chunk = ""
                    
                    for sent in sentences:
                        test_sent = f"{sentence_chunk} {sent}".strip() if sentence_chunk else sent
                        
                        if len(test_sent) <= max_size:
                            sentence_chunk = test_sent
                        else:
                            if sentence_chunk:
                                chunks.append(sentence_chunk)
                            
                            # Hard split if single sentence too long
                            if len(sent) > max_size:
                                for i in range(0, len(sent), max_size - CHUNK_OVERLAP):
                                    chunks.append(sent[i:i + max_size])
                            else:
                                sentence_chunk = sent
                    
                    if sentence_chunk:
                        current_chunk = sentence_chunk
                    else:
                        current_chunk = ""
                else:
                    current_chunk = para
        
        if current_chunk:
            chunks.append(current_chunk)
        
        return chunks

    def chunk_section(self, section: Dict[str, str]) -> List[Chunk]:
        """
        Chunk a section into smaller pieces if needed.
        Preserves context with overlap.
        """
        text = section['text']
        title = section['title']
        
        if len(text) <= TARGET_CHUNK_SIZE:
            return [Chunk(
                title=title,
                text=text,
                char_count=len(text),
                metadata={
                    'h2': section.get('h2'),
                    'h3': section.get('h3')
                }
            )]
        
        # Split the text
        text_chunks = self.smart_split_text(text, TARGET_CHUNK_SIZE)
        
        chunks = []
        for i, chunk_text in enumerate(text_chunks):
            chunks.append(Chunk(
                title=f"{title} (Part {i+1}/{len(text_chunks)})" if len(text_chunks) > 1 else title,
                text=chunk_text,
                char_count=len(chunk_text),
                part_number=i + 1,
                total_parts=len(text_chunks),
                metadata={
                    'h2': section.get('h2'),
                    'h3': section.get('h3'),
                    'is_split': len(text_chunks) > 1
                }
            ))
        
        return chunks

    def generate_embedding(self, text: str) -> List[float]:
        """Generate embedding using Gemini text-embedding-004 (FREE)"""
        for attempt in range(MAX_RETRIES):
            try:
                result = genai.embed_content(
                    model=EMBEDDING_MODEL,
                    content=text,
                    task_type="retrieval_document"
                )
                self.stats['embeddings_generated'] += 1
                return result['embedding']
                
            except Exception as e:
                if attempt < MAX_RETRIES - 1:
                    wait = RETRY_DELAY * (2 ** attempt)
                    print(f"  ⚠️  Retry {attempt + 1}/{MAX_RETRIES} after {wait}s: {e}")
                    time.sleep(wait)
                else:
                    self.stats['errors'].append(f"Embedding failed: {e}")
                    raise

    def clear_existing(self, file_name: str):
        """Clear existing embeddings for this file"""
        try:
            result = self.supabase.delete('knowledge_embeddings', {
                'project_type': PROJECT_TYPE,
                'file_name': file_name
            })
            
            deleted = len(result) if isinstance(result, list) else 0
            print(f"🗑️  Cleared {deleted} existing embeddings for {file_name}")
            return deleted
            
        except Exception as e:
            print(f"⚠️  Warning: Could not clear existing: {e}")
            return 0

    def upload_chunks(self, chunks: List[Chunk], file_name: str) -> int:
        """Upload chunks with embeddings to Supabase"""
        records = []
        
        for i, chunk in enumerate(chunks):
            record = {
                'project_type': PROJECT_TYPE,
                'file_name': file_name,
                'section_title': chunk.title,
                'chunk_text': chunk.text,
                'embedding': chunk.embedding,
                'metadata': {
                    'char_count': chunk.char_count,
                    'part': chunk.part_number,
                    'total_parts': chunk.total_parts,
                    'chunk_index': i,
                    **chunk.metadata
                }
            }
            records.append(record)
        
        # Upload in batches of 50
        batch_size = 50
        uploaded = 0
        
        for i in range(0, len(records), batch_size):
            batch = records[i:i + batch_size]
            print(f"   Uploading batch {i//batch_size + 1} ({len(batch)} records)...")
            try:
                result = self.supabase.insert('knowledge_embeddings', batch)
                batch_count = len(result) if isinstance(result, list) else 0
                uploaded += batch_count
                print(f"   ✓ Batch {i//batch_size + 1} uploaded: {batch_count} rows")
                
            except Exception as e:
                self.stats['errors'].append(f"Upload batch {i//batch_size + 1} failed: {e}")
                print(f"  ❌ Batch upload error: {e}")
        
        self.stats['rows_uploaded'] = uploaded
        return uploaded

    def process_file(self, file_path: Path, dry_run: bool = False, clear_existing: bool = False) -> Dict:
        """
        Process the market intelligence file:
        1. Read and parse markdown
        2. Extract sections by headers
        3. Chunk large sections
        4. Generate embeddings
        5. Upload to Supabase
        """
        file_name = file_path.name
        
        print(f"\n📄 Processing: {file_name}")
        print("=" * 60)
        
        # Step 1: Read file
        print("📖 Reading file...")
        content = self.read_file(file_path)
        print(f"   Total characters: {len(content):,}")
        
        # Step 2: Extract sections
        print("📑 Extracting sections...")
        sections = self.extract_sections(content)
        print(f"   Found {len(sections)} sections")
        
        # Step 3: Chunk sections
        print("✂️  Chunking sections...")
        all_chunks = []
        for section in sections:
            chunks = self.chunk_section(section)
            all_chunks.extend(chunks)
        
        self.stats['chunks_created'] = len(all_chunks)
        split_count = sum(1 for c in all_chunks if c.metadata.get('is_split'))
        print(f"   Created {len(all_chunks)} chunks ({split_count} sections were split)")
        
        # Print chunk distribution
        chunk_sizes = [c.char_count for c in all_chunks]
        print(f"   Chunk sizes: min={min(chunk_sizes)}, max={max(chunk_sizes)}, avg={sum(chunk_sizes)//len(chunk_sizes)}")
        
        if dry_run:
            print("\n🔍 DRY RUN - Sample chunks:")
            for i, chunk in enumerate(all_chunks[:5]):
                print(f"\n   [{i+1}] {chunk.title}")
                print(f"       {chunk.text[:100]}...")
            
            if len(all_chunks) > 5:
                print(f"\n   ... and {len(all_chunks) - 5} more chunks")
            
            return self.stats
        
        # Step 4: Clear existing (if requested)
        if clear_existing:
            self.clear_existing(file_name)
        
        # Step 5: Generate embeddings
        print(f"\n🧠 Generating embeddings (Gemini FREE)...")
        for i, chunk in enumerate(all_chunks):
            try:
                chunk.embedding = self.generate_embedding(chunk.text)
                
                # Progress indicator
                if (i + 1) % 10 == 0 or i == len(all_chunks) - 1:
                    print(f"   Embedded {i + 1}/{len(all_chunks)} chunks")
                
                time.sleep(EMBEDDING_DELAY)  # Rate limiting
                
            except Exception as e:
                print(f"   ❌ Failed to embed chunk {i + 1}: {e}")
                return self.stats
        
        # Step 6: Upload to Supabase
        print(f"\n📤 Uploading to Supabase...")
        uploaded = self.upload_chunks(all_chunks, file_name)
        print(f"   ✅ Total uploaded: {uploaded} rows")
        
        return self.stats

    def print_summary(self):
        """Print processing summary"""
        print("\n" + "=" * 60)
        print("📊 SUMMARY")
        print("=" * 60)
        print(f"Sections found:      {self.stats['sections_found']}")
        print(f"Chunks created:      {self.stats['chunks_created']}")
        print(f"Embeddings generated: {self.stats['embeddings_generated']}")
        print(f"Rows uploaded:       {self.stats['rows_uploaded']}")
        
        if self.stats['errors']:
            print(f"\n⚠️  Errors ({len(self.stats['errors'])}):")
            for err in self.stats['errors']:
                print(f"   - {err}")
        else:
            print("\n✅ No errors!")
        
        print("=" * 60)
    
    def close(self):
        """Cleanup resources"""
        self.supabase.close()


def main():
    """Main entry point"""
    parser = argparse.ArgumentParser(
        description='Embed TIER 3 market intelligence for Sparkfluence RAG',
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  python embed_market_intel.py --file "market_intel_2026.md"
  python embed_market_intel.py --file "market_intel_2026.md" --dry-run
  python embed_market_intel.py --file "market_intel_2026.md" --clear-existing
        """
    )

    parser.add_argument(
        '--file',
        required=True,
        help='Path to market intelligence markdown file'
    )

    parser.add_argument(
        '--dry-run',
        action='store_true',
        help='Process file and show chunks without uploading'
    )

    parser.add_argument(
        '--clear-existing',
        action='store_true',
        help='Clear existing embeddings for this file before uploading'
    )

    args = parser.parse_args()

    # Validate file exists
    file_path = Path(args.file)
    if not file_path.exists():
        print(f"❌ Error: File not found: {file_path}")
        sys.exit(1)

    if not file_path.is_file():
        print(f"❌ Error: Path is not a file: {file_path}")
        sys.exit(1)

    # Check environment variables
    gemini_key = os.getenv('GEMINI_API_KEY')
    supabase_url = os.getenv('SUPABASE_URL')
    supabase_key = os.getenv('SUPABASE_SERVICE_KEY')

    missing = []
    if not gemini_key:
        missing.append('GEMINI_API_KEY')
    if not supabase_url:
        missing.append('SUPABASE_URL')
    if not supabase_key:
        missing.append('SUPABASE_SERVICE_KEY')

    if missing:
        print("❌ Error: Missing required environment variables:")
        for var in missing:
            print(f"   - {var}")
        print("\nPlease set these in your .env file")
        sys.exit(1)

    # Initialize embedder
    print("🚀 Sparkfluence TIER 3 Market Intelligence Embedder")
    print(f"   Model: {EMBEDDING_MODEL} (FREE)")
    print(f"   Target chunk size: {TARGET_CHUNK_SIZE} chars")
    
    embedder = None
    try:
        embedder = MarketIntelEmbedder(gemini_key, supabase_url, supabase_key)
    except Exception as e:
        print(f"❌ Error initializing embedder: {e}")
        sys.exit(1)

    # Process file
    start_time = time.time()
    
    try:
        embedder.process_file(
            file_path,
            dry_run=args.dry_run,
            clear_existing=args.clear_existing
        )
    except Exception as e:
        print(f"\n❌ Fatal error: {e}")
        sys.exit(1)
    finally:
        if embedder:
            embedder.close()

    elapsed = time.time() - start_time
    
    # Print summary
    embedder.print_summary()
    print(f"Time elapsed: {elapsed:.2f}s")
    
    # Exit code
    sys.exit(0 if not embedder.stats['errors'] else 1)


if __name__ == '__main__':
    main()
