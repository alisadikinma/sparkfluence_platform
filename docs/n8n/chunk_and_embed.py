#!/usr/bin/env python3
"""
Knowledge File Chunker and Embedder for Sparkfluence RAG

This script processes markdown knowledge files, chunks them intelligently,
generates Gemini embeddings (FREE), and uploads them to Supabase vector database.

Usage:
  python chunk_and_embed.py --folder "path/to/folder" --project-type viral_script
  python chunk_and_embed.py --folder "path/to/folder" --project-type image_video
  python chunk_and_embed.py --folder "path/to/folder" --project-type viral_script --dry-run

Environment Variables:
  - GEMINI_API_KEY: Your Google AI API key
  - SUPABASE_URL: Your Supabase project URL
  - SUPABASE_SERVICE_KEY: Your Supabase service role key

Dependencies:
  pip install google-generativeai supabase python-dotenv
"""

import os
import sys
import argparse
import time
import re
from pathlib import Path
from typing import List, Dict
from dotenv import load_dotenv

try:
    import google.generativeai as genai
    from supabase import create_client, Client
except ImportError as e:
    print(f"❌ Error: Missing required dependency: {e}")
    print("Please install dependencies:")
    print("  pip install google-generativeai supabase python-dotenv")
    sys.exit(1)

# Load environment variables
load_dotenv()

# Constants
EMBEDDING_MODEL = "models/text-embedding-004"
EMBEDDING_DIMENSION = 768
TARGET_CHUNK_SIZE_MAX = 1000  # characters (simpler than tokens for Gemini)
CHUNK_OVERLAP = 100  # characters
BATCH_SIZE = 50  # embeddings per batch
MAX_RETRIES = 3
RETRY_DELAY = 2  # seconds


class KnowledgeEmbedder:
    """Handles chunking, embedding, and uploading knowledge files"""

    def __init__(self, gemini_key: str, supabase_url: str, supabase_key: str):
        """Initialize API clients"""
        genai.configure(api_key=gemini_key)
        self.supabase_client: Client = create_client(supabase_url, supabase_key)

    def read_markdown_file(self, file_path: Path) -> str:
        """Read markdown file content"""
        try:
            with open(file_path, 'r', encoding='utf-8') as f:
                return f.read()
        except Exception as e:
            raise Exception(f"Failed to read {file_path}: {e}")

    def extract_sections(self, content: str, file_name: str) -> List[Dict[str, str]]:
        """
        Extract sections from markdown content based on ## headers.
        If no ## headers found, split by paragraphs.
        """
        sections = []

        # Try to split by ## headers
        header_pattern = r'^##\s+(.+)$'
        matches = list(re.finditer(header_pattern, content, re.MULTILINE))

        if matches:
            # Split by ## headers
            for i, match in enumerate(matches):
                section_title = match.group(1).strip()
                start_pos = match.end()
                end_pos = matches[i + 1].start() if i + 1 < len(matches) else len(content)
                section_text = content[start_pos:end_pos].strip()

                if section_text:  # Only add non-empty sections
                    sections.append({
                        'title': section_title,
                        'text': section_text
                    })
        else:
            # Fallback: split by double newlines (paragraphs)
            paragraphs = [p.strip() for p in content.split('\n\n') if p.strip()]
            for i, para in enumerate(paragraphs):
                sections.append({
                    'title': f"{file_name} - Part {i + 1}",
                    'text': para
                })

        return sections

    def chunk_section(self, section: Dict[str, str]) -> List[Dict[str, str]]:
        """
        Chunk a section into smaller pieces if it exceeds max size.
        Uses overlap to maintain context between chunks.
        """
        text = section['text']
        title = section['title']
        char_count = len(text)

        if char_count <= TARGET_CHUNK_SIZE_MAX:
            # Section is small enough, return as-is
            return [{
                'title': title,
                'text': text,
                'char_count': char_count
            }]

        # Section is too large, split it
        chunks = []
        sentences = re.split(r'(?<=[.!?])\s+', text)
        current_chunk = []
        current_chars = 0

        for sentence in sentences:
            sentence_chars = len(sentence)

            if current_chars + sentence_chars > TARGET_CHUNK_SIZE_MAX and current_chunk:
                # Save current chunk
                chunk_text = ' '.join(current_chunk)
                chunks.append({
                    'title': f"{title} (Part {len(chunks) + 1})",
                    'text': chunk_text,
                    'char_count': len(chunk_text)
                })

                # Start new chunk with overlap
                overlap_sentences = []
                overlap_chars = 0
                for sent in reversed(current_chunk):
                    sent_chars = len(sent)
                    if overlap_chars + sent_chars <= CHUNK_OVERLAP:
                        overlap_sentences.insert(0, sent)
                        overlap_chars += sent_chars
                    else:
                        break

                current_chunk = overlap_sentences
                current_chars = overlap_chars

            current_chunk.append(sentence)
            current_chars += sentence_chars

        # Add final chunk
        if current_chunk:
            chunk_text = ' '.join(current_chunk)
            chunks.append({
                'title': f"{title} (Part {len(chunks) + 1})" if len(chunks) > 0 else title,
                'text': chunk_text,
                'char_count': len(chunk_text)
            })

        return chunks

    def generate_embedding(self, text: str) -> List[float]:
        """Generate embedding for a single text using Gemini"""
        for attempt in range(MAX_RETRIES):
            try:
                result = genai.embed_content(
                    model=EMBEDDING_MODEL,
                    content=text,
                    task_type="retrieval_document"
                )
                return result['embedding']
            except Exception as e:
                if attempt < MAX_RETRIES - 1:
                    wait_time = RETRY_DELAY * (2 ** attempt)  # Exponential backoff
                    print(f"  ⚠️  Retry {attempt + 1}/{MAX_RETRIES} after {wait_time}s: {e}")
                    time.sleep(wait_time)
                else:
                    raise Exception(f"Failed to generate embedding after {MAX_RETRIES} attempts: {e}")

    def generate_embeddings_batch(self, texts: List[str]) -> List[List[float]]:
        """Generate embeddings for multiple texts"""
        embeddings = []
        for text in texts:
            embedding = self.generate_embedding(text)
            embeddings.append(embedding)
            time.sleep(0.1)  # Rate limiting
        return embeddings

    def upsert_to_supabase(self, chunks: List[Dict], project_type: str, file_name: str):
        """Upload chunks with embeddings to Supabase"""
        records = []

        for chunk in chunks:
            record = {
                'project_type': project_type,
                'file_name': file_name,
                'section_title': chunk['title'],
                'chunk_text': chunk['text'],
                'embedding': chunk['embedding'],
                'metadata': {
                    'char_count': chunk['char_count'],
                    'chunk_index': chunk.get('index', 0)
                }
            }
            records.append(record)

        # Upsert to Supabase
        try:
            result = self.supabase_client.table('knowledge_embeddings').insert(records).execute()
            return len(result.data) if result.data else 0
        except Exception as e:
            raise Exception(f"Failed to upsert to Supabase: {e}")

    def process_file(self, file_path: Path, project_type: str, dry_run: bool = False) -> Dict:
        """Process a single markdown file"""
        file_name = file_path.name

        # Read file
        content = self.read_markdown_file(file_path)

        # Extract sections
        sections = self.extract_sections(content, file_name)
        print(f"  - Found {len(sections)} sections")

        # Chunk sections
        all_chunks = []
        for section in sections:
            chunks = self.chunk_section(section)
            all_chunks.extend(chunks)

        # Check if any sections were split
        split_count = len(all_chunks) - len(sections)
        if split_count > 0:
            print(f"  - Created {len(all_chunks)} chunks ({split_count} sections split)")
        else:
            print(f"  - Created {len(all_chunks)} chunks")

        if dry_run:
            print(f"  - [DRY RUN] Skipping embedding and upload")
            return {
                'file_name': file_name,
                'chunks': len(all_chunks),
                'uploaded': 0,
                'error': None
            }

        # Generate embeddings
        print(f"  - Generating embeddings...")
        try:
            texts = [chunk['text'] for chunk in all_chunks]
            
            for i, chunk in enumerate(all_chunks):
                embedding = self.generate_embedding(chunk['text'])
                chunk['embedding'] = embedding
                chunk['index'] = i
                
                # Progress indicator
                if (i + 1) % 10 == 0 or i == len(all_chunks) - 1:
                    print(f"    Embedded {i + 1}/{len(all_chunks)} chunks")

            # Upload to Supabase
            print(f"  - Uploading to Supabase...")
            uploaded = self.upsert_to_supabase(all_chunks, project_type, file_name)
            print(f"  ✅ Uploaded {uploaded} chunks")

            return {
                'file_name': file_name,
                'chunks': len(all_chunks),
                'uploaded': uploaded,
                'error': None
            }

        except Exception as e:
            print(f"  ❌ Error: {e}")
            return {
                'file_name': file_name,
                'chunks': len(all_chunks),
                'uploaded': 0,
                'error': str(e)
            }

    def process_folder(self, folder_path: Path, project_type: str, dry_run: bool = False) -> Dict:
        """Process all markdown files in a folder"""
        # Find all .md files
        md_files = sorted(folder_path.glob('*.md'))

        if not md_files:
            print(f"⚠️  No .md files found in {folder_path}")
            return {
                'total_files': 0,
                'total_chunks': 0,
                'total_uploaded': 0,
                'errors': 0,
                'results': []
            }

        print(f"\n📁 Processing folder: {folder_path}")
        print(f"📋 Project type: {project_type}")
        print(f"📄 Found {len(md_files)} markdown files\n")

        results = []
        total_chunks = 0
        total_uploaded = 0
        errors = 0

        for i, file_path in enumerate(md_files, 1):
            print(f"[{i}/{len(md_files)}] Processing: {file_path.name}")

            try:
                result = self.process_file(file_path, project_type, dry_run)
                results.append(result)
                total_chunks += result['chunks']
                total_uploaded += result['uploaded']
                if result['error']:
                    errors += 1
            except Exception as e:
                print(f"  ❌ Fatal error processing {file_path.name}: {e}")
                results.append({
                    'file_name': file_path.name,
                    'chunks': 0,
                    'uploaded': 0,
                    'error': str(e)
                })
                errors += 1

            print()  # Blank line between files

        return {
            'total_files': len(md_files),
            'total_chunks': total_chunks,
            'total_uploaded': total_uploaded,
            'errors': errors,
            'results': results
        }


def main():
    """Main entry point"""
    parser = argparse.ArgumentParser(
        description='Chunk and embed knowledge files for Sparkfluence RAG (Gemini FREE)',
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  python chunk_and_embed.py --folder "D:\\Projects\\Sparkfluence_n8n\\Viral_Script_Generator" --project-type viral_script
  python chunk_and_embed.py --folder "D:\\Projects\\Sparkfluence_n8n\\Image_and_Video_Generator" --project-type image_video
  python chunk_and_embed.py --folder "./knowledge" --project-type viral_script --dry-run
        """
    )

    parser.add_argument(
        '--folder',
        required=True,
        help='Path to folder containing markdown knowledge files'
    )

    parser.add_argument(
        '--project-type',
        required=True,
        choices=['viral_script', 'image_video'],
        help='Project type for categorizing embeddings'
    )

    parser.add_argument(
        '--dry-run',
        action='store_true',
        help='Process files and show chunks without uploading to database'
    )

    args = parser.parse_args()

    # Validate folder exists
    folder_path = Path(args.folder)
    if not folder_path.exists():
        print(f"❌ Error: Folder not found: {folder_path}")
        sys.exit(1)

    if not folder_path.is_dir():
        print(f"❌ Error: Path is not a directory: {folder_path}")
        sys.exit(1)

    # Check environment variables
    gemini_key = os.getenv('GEMINI_API_KEY')
    supabase_url = os.getenv('SUPABASE_URL')
    supabase_key = os.getenv('SUPABASE_SERVICE_KEY')

    if not all([gemini_key, supabase_url, supabase_key]):
        print("❌ Error: Missing required environment variables")
        print("Please ensure these are set in your .env file:")
        print("  - GEMINI_API_KEY")
        print("  - SUPABASE_URL")
        print("  - SUPABASE_SERVICE_KEY")
        sys.exit(1)

    # Initialize embedder
    print("🚀 Initializing Gemini Embedder (FREE)...")
    try:
        embedder = KnowledgeEmbedder(gemini_key, supabase_url, supabase_key)
    except Exception as e:
        print(f"❌ Error initializing embedder: {e}")
        sys.exit(1)

    # Process folder
    start_time = time.time()
    summary = embedder.process_folder(folder_path, args.project_type, args.dry_run)
    elapsed = time.time() - start_time

    # Print summary
    print("=" * 60)
    print("📊 SUMMARY")
    print("=" * 60)
    print(f"Files processed: {summary['total_files']}")
    print(f"Total chunks: {summary['total_chunks']}")
    print(f"Total uploaded: {summary['total_uploaded']}")
    print(f"Errors: {summary['errors']}")
    print(f"Time elapsed: {elapsed:.2f}s")

    if summary['errors'] > 0:
        print("\n⚠️  Files with errors:")
        for result in summary['results']:
            if result['error']:
                print(f"  - {result['file_name']}: {result['error']}")

    print("=" * 60)

    # Exit with appropriate code
    sys.exit(0 if summary['errors'] == 0 else 1)


if __name__ == '__main__':
    main()
