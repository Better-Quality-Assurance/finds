/**
 * Contact Information Detection
 *
 * Detects attempts to share contact information (phone, email, social media)
 * in user-generated content. Used to prevent fee circumvention.
 */

export interface ContactDetectionResult {
  hasContactInfo: boolean
  detectedTypes: string[]
  matches: string[]
  confidence: 'high' | 'medium' | 'low'
  suggestion?: string
}

// ============================================================================
// Unicode/Encoding Normalization
// ============================================================================

/**
 * Normalize unicode lookalikes to ASCII equivalents
 * Catches homoglyph attacks (Cyrillic 'о' looks like Latin 'o')
 */
const HOMOGLYPH_MAP: Record<string, string> = {
  // Cyrillic lookalikes
  'а': 'a', 'е': 'e', 'о': 'o', 'р': 'p', 'с': 'c', 'у': 'y', 'х': 'x',
  'А': 'A', 'Е': 'E', 'О': 'O', 'Р': 'P', 'С': 'C', 'У': 'Y', 'Х': 'X',
  // Greek lookalikes
  'α': 'a', 'ο': 'o', 'ρ': 'p',
  // Special characters that look like numbers
  '０': '0', '１': '1', '２': '2', '３': '3', '４': '4',
  '５': '5', '６': '6', '７': '7', '８': '8', '９': '9',
  // Subscript/superscript numbers
  '⁰': '0', '¹': '1', '²': '2', '³': '3', '⁴': '4',
  '⁵': '5', '⁶': '6', '⁷': '7', '⁸': '8', '⁹': '9',
  '₀': '0', '₁': '1', '₂': '2', '₃': '3', '₄': '4',
  '₅': '5', '₆': '6', '₇': '7', '₈': '8', '₉': '9',
  // Circled numbers
  '①': '1', '②': '2', '③': '3', '④': '4', '⑤': '5',
  '⑥': '6', '⑦': '7', '⑧': '8', '⑨': '9', '⓪': '0',
  // Special @ symbols
  '＠': '@', '©': 'c', '®': 'r',
}

function normalizeHomoglyphs(text: string): string {
  return text.split('').map(char => HOMOGLYPH_MAP[char] || char).join('')
}

/**
 * Normalize leetspeak (1337) to normal text
 */
function normalizeLeetspeak(text: string): string {
  const leetMap: Record<string, string> = {
    '0': 'o', '1': 'i', '3': 'e', '4': 'a', '5': 's',
    '7': 't', '8': 'b', '@': 'a', '$': 's',
  }
  return text.split('').map(char => leetMap[char] || char).join('')
}

/**
 * Remove invisible/zero-width characters
 */
function removeInvisibleChars(text: string): string {
  // Remove zero-width chars, soft hyphens, etc.
  return text.replace(/[\u200B-\u200D\u2060\uFEFF\u00AD]/g, '')
}

/**
 * Normalize text for detection (apply all normalizations)
 */
function normalizeForDetection(text: string): string {
  let normalized = text
  normalized = removeInvisibleChars(normalized)
  normalized = normalizeHomoglyphs(normalized)
  // Don't apply leetspeak normalization to the main text as it might cause false positives
  // Only use it for specific checks
  return normalized
}

// Phone number patterns (international formats)
const PHONE_PATTERNS = [
  // Standard formats with separators
  /\b\d{3}[-.\s]?\d{3}[-.\s]?\d{4}\b/g,               // 123-456-7890
  /\b\d{4}[-.\s]?\d{3}[-.\s]?\d{3}\b/g,               // 1234-567-890 (EU style)
  /\b\+\d{1,3}[-.\s]?\d{2,4}[-.\s]?\d{3,4}[-.\s]?\d{3,4}\b/g, // +40 123 456 789
  /\b00\d{1,3}[-.\s]?\d{2,4}[-.\s]?\d{3,4}[-.\s]?\d{3,4}\b/g, // 0040 123 456 789
  // Romanian formats
  /\b0\d{3}[-.\s]?\d{3}[-.\s]?\d{3}\b/g,              // 0723-456-789
  /\b07\d{2}[-.\s]?\d{3}[-.\s]?\d{3}\b/g,             // 0722 123 456
  // Obfuscated attempts
  /\b\d\s*\d\s*\d\s*\d\s*\d\s*\d\s*\d\s*\d\s*\d\s*\d?\b/g, // Spaced digits
]

// Written number obfuscation (common tricks)
const WRITTEN_NUMBER_WORDS = [
  'zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine',
  'unu', 'doi', 'trei', 'patru', 'cinci', 'șase', 'sase', 'șapte', 'sapte', 'opt', 'nouă', 'noua',
]
const WRITTEN_NUMBER_PATTERN = new RegExp(
  `\\b(${WRITTEN_NUMBER_WORDS.join('|')})\\s+(${WRITTEN_NUMBER_WORDS.join('|')})\\s+(${WRITTEN_NUMBER_WORDS.join('|')})`,
  'gi'
)

// Email patterns
const EMAIL_PATTERNS = [
  // Standard email
  /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g,
  // Obfuscated
  /\b[A-Za-z0-9._%+-]+\s*[\[\(]?\s*at\s*[\]\)]?\s*[A-Za-z0-9.-]+\s*[\[\(]?\s*dot\s*[\]\)]?\s*[A-Za-z]{2,}\b/gi,
  /\b[A-Za-z0-9._%+-]+\s*@\s*[A-Za-z0-9.-]+\s*\.\s*[A-Za-z]{2,}\b/g, // Spaced out
]

// Social media patterns
const SOCIAL_PATTERNS = [
  // Usernames with platform names
  /\b(facebook|fb|instagram|insta|ig|whatsapp|wa|telegram|tg|signal|viber|twitter|x\.com|tiktok)[:\s]*[@]?[A-Za-z0-9._-]+\b/gi,
  // Direct handles
  /@[A-Za-z0-9._-]{3,30}\b/g, // @username
  // WhatsApp specific
  /\bwhatsapp\b.*\d{5,}/gi,
  /\bwa\s*:?\s*\d{5,}/gi,
  /\bcontact.*whatsapp/gi,
  /\bwhatsapp.*contact/gi,
]

// Phrases suggesting off-platform contact
const CONTACT_PHRASES = [
  /\bcall\s+me\b/gi,
  /\btext\s+me\b/gi,
  /\bmessage\s+me\b/gi,
  /\bcontact\s+me\s+(directly|outside|off)/gi,
  /\bmy\s+(phone|number|email|mail|whatsapp)/gi,
  /\breach\s+me\s+(at|on)/gi,
  /\bsend\s+me\s+(an?\s+)?(email|message)/gi,
  /\bi('?m|am)\s+on\s+(whatsapp|telegram|signal|viber)/gi,
  /\bfind\s+me\s+on/gi,
  /\bdm\s+me\b/gi,
  /\bpm\s+me\b/gi,
]

/**
 * Detect contact information in text
 */
export function detectContactInfo(text: string): ContactDetectionResult {
  const detectedTypes: string[] = []
  const matches: string[] = []

  // Apply unicode normalization to catch obfuscation attempts
  const cleanText = normalizeForDetection(text)
  const normalizedText = cleanText.toLowerCase()

  // Check if original differs from normalized (potential obfuscation)
  if (text !== cleanText && text.length === cleanText.length) {
    // Check if the difference reveals hidden content
    const hiddenChars = text.length - cleanText.replace(/[\u200B-\u200D\u2060\uFEFF\u00AD]/g, '').length
    if (hiddenChars > 0) {
      detectedTypes.push('obfuscation_attempt')
      matches.push(`[${hiddenChars} hidden characters detected]`)
    }
  }

  // Check phone patterns (use normalized text to catch unicode tricks)
  for (const pattern of PHONE_PATTERNS) {
    const phoneMatches = cleanText.match(pattern)
    if (phoneMatches) {
      // Filter out likely non-phone numbers (years, prices, etc.)
      const realPhones = phoneMatches.filter(m => {
        const digits = m.replace(/\D/g, '')
        // Phone numbers typically 7-15 digits
        if (digits.length < 7 || digits.length > 15) {return false}
        // Skip if looks like a year (1900-2099)
        if (/^(19|20)\d{2}$/.test(digits)) {return false}
        // Skip if looks like a price
        if (/^\d{1,6}$/.test(digits) && text.includes('€')) {return false}
        return true
      })
      if (realPhones.length > 0) {
        detectedTypes.push('phone')
        matches.push(...realPhones)
      }
    }
  }

  // Check written numbers (obfuscation attempt)
  const writtenMatches = text.match(WRITTEN_NUMBER_PATTERN)
  if (writtenMatches && writtenMatches.length >= 1) {
    detectedTypes.push('phone_obfuscated')
    matches.push(...writtenMatches)
  }

  // Check email patterns
  for (const pattern of EMAIL_PATTERNS) {
    const emailMatches = text.match(pattern)
    if (emailMatches) {
      detectedTypes.push('email')
      matches.push(...emailMatches)
    }
  }

  // Check social media patterns
  for (const pattern of SOCIAL_PATTERNS) {
    const socialMatches = text.match(pattern)
    if (socialMatches) {
      // Filter out false positives
      const filtered = socialMatches.filter(m => {
        // Skip if it's just the platform name without a username
        const lower = m.toLowerCase()
        if (['facebook', 'instagram', 'whatsapp', 'telegram', 'twitter'].includes(lower)) {
          return false
        }
        return true
      })
      if (filtered.length > 0) {
        detectedTypes.push('social_media')
        matches.push(...filtered)
      }
    }
  }

  // Check contact phrases
  for (const pattern of CONTACT_PHRASES) {
    if (pattern.test(normalizedText)) {
      detectedTypes.push('contact_request')
      const phraseMatch = normalizedText.match(pattern)
      if (phraseMatch) {matches.push(phraseMatch[0])}
    }
  }

  // Determine confidence
  let confidence: 'high' | 'medium' | 'low' = 'low'
  if (detectedTypes.includes('email') || detectedTypes.includes('phone')) {
    confidence = 'high'
  } else if (detectedTypes.includes('social_media') || detectedTypes.includes('phone_obfuscated')) {
    confidence = 'medium'
  } else if (detectedTypes.includes('contact_request')) {
    confidence = 'low' // Could be legitimate questions
  }

  const hasContactInfo = detectedTypes.length > 0 && confidence !== 'low'

  return {
    hasContactInfo,
    detectedTypes: Array.from(new Set(detectedTypes)),
    matches: Array.from(new Set(matches)).slice(0, 5), // Limit to 5 matches
    confidence,
    suggestion: hasContactInfo
      ? 'Please use the public comments for questions about the vehicle. Private contact details can only be shared after the auction is won and payment is complete.'
      : undefined,
  }
}

/**
 * Quick check if text likely contains contact info (faster than full detection)
 */
export function hasLikelyContactInfo(text: string): boolean {
  // Quick regex check without full analysis
  const quickPatterns = [
    /@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/, // email-like
    /\b\d{3}[-.\s]?\d{3}[-.\s]?\d{4}\b/, // phone-like
    /\bwhatsapp\b/i,
    /\btelegram\b/i,
    /\bcall\s+me\b/i,
    /\btext\s+me\b/i,
  ]

  return quickPatterns.some(p => p.test(text))
}
