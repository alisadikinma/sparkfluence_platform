/**
 * Product Naming Rule - Inject ke script generation prompt
 * Memastikan LLM selalu output brand + model name lengkap
 * 
 * @example
 * ✅ "POCO M4 Pro" (correct)
 * ❌ "M4 Pro" (missing brand)
 */

export const PRODUCT_NAMING_RULE = `
═══════════════════════════════════════════════════════════════
📱 ATURAN NAMA PRODUK TEKNOLOGI (WAJIB DIPATUHI)
═══════════════════════════════════════════════════════════════

Ketika menyebut produk teknologi (HP, laptop, gadget, earbuds, smartwatch), 
WAJIB gunakan format lengkap: **[BRAND] [MODEL]**

### ✅ Contoh BENAR
| Salah | Benar |
|-------|-------|
| M4 Pro | **POCO M4 Pro** |
| M5 | **POCO M5** |
| X5 Pro | **POCO X5 Pro** |
| F6 Pro | **POCO F6 Pro** |
| Galaxy S24 | **Samsung Galaxy S24** |
| Galaxy Z Fold 6 | **Samsung Galaxy Z Fold 6** |
| Redmi Note 13 | **Xiaomi Redmi Note 13** |
| Note 13 Pro | **Xiaomi Redmi Note 13 Pro** |
| Reno 12 | **OPPO Reno 12** |
| Find X7 | **OPPO Find X7** |
| Nord 4 | **OnePlus Nord 4** |
| ROG Phone 8 | **ASUS ROG Phone 8** |
| Pixel 9 | **Google Pixel 9** |
| GT 5 | **Realme GT 5** |
| V30 Pro | **Vivo V30 Pro** |
| Phone 2 | **Nothing Phone 2** |
| Xperia 1 V | **Sony Xperia 1 V** |

### 📋 Quick Brand Reference
| Pattern/Series | Brand |
|----------------|-------|
| M/X/F/C series (M4, M5, X5, X6, F5, F6, C65) | **POCO** |
| Galaxy S/A/M/Z/F series | **Samsung** |
| Redmi, Redmi Note, Redmi K series | **Xiaomi** |
| Xiaomi numbered (14, 15) | **Xiaomi** |
| iPhone, iPad, MacBook, AirPods | **Apple** |
| Find X/N, Reno series | **OPPO** |
| V/X/Y/T series | **Vivo** |
| Nord, OnePlus numbered (12, 13) | **OnePlus** |
| Pixel series | **Google** |
| ROG Phone, Zenfone | **ASUS** |
| Xperia series | **Sony** |
| Edge, Moto G, Razr | **Motorola** |
| GT, Narzo, C series | **Realme** |
| Phone (1, 2), Ear | **Nothing** |
| Magic, Honor numbered | **Honor** |
| Note, Hot, Zero, GT series | **Infinix** |
| Spark, Camon, Phantom, Pova | **Tecno** |

### ⚠️ Jika Tidak Yakin Brand-nya
Gunakan deskripsi umum:
- "HP ini" atau "smartphone ini"
- "gadget ini" atau "device ini"
- "earbuds ini" atau "TWS ini"

**JANGAN pernah menyebut model tanpa brand prefix.**
`

/**
 * Inject product naming rule ke script generation prompt
 * Posisi: sebelum OUTPUT FORMAT section
 */
export function injectProductNamingRule(basePrompt: string): string {
  // Cari posisi yang tepat untuk inject
  // Prioritas: sebelum "OUTPUT FORMAT", "GENERATE NOW", atau di akhir
  
  const insertionPoints = [
    '═══════════════════════════════════════════════════════════════\n⚡ GENERATE NOW',
    '## OUTPUT FORMAT',
    '## OUTPUT',
    'GENERATE NOW',
    'Output ONLY valid JSON'
  ]
  
  for (const point of insertionPoints) {
    if (basePrompt.includes(point)) {
      return basePrompt.replace(
        point,
        `${PRODUCT_NAMING_RULE}\n\n${point}`
      )
    }
  }
  
  // Fallback: append di akhir
  return `${basePrompt}\n\n${PRODUCT_NAMING_RULE}`
}
