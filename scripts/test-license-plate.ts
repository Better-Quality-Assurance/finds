/**
 * Test script for license plate detection and blurring
 *
 * Run with: source .env.local && npx tsx scripts/test-license-plate.ts
 */

import { writeFileSync } from 'fs'
import { detectAndBlurPlates } from '@/services/ai/license-plate.service'

// Test image with visible license plate
// Using a car image from Pexels (publicly accessible, no auth required)
const TEST_IMAGE_URL = 'https://images.pexels.com/photos/170811/pexels-photo-170811.jpeg?auto=compress&cs=tinysrgb&w=800'

async function main() {
  console.log('🚗 Testing license plate detection and blurring...\n')
  console.log(`Image URL: ${TEST_IMAGE_URL}\n`)

  try {
    const result = await detectAndBlurPlates(TEST_IMAGE_URL)

    console.log('📊 Detection Result:')
    console.log(`  - Detected: ${result.detection.detected}`)
    console.log(`  - Model: ${result.detection.model}`)
    console.log(`  - Processing time: ${result.detection.processingTime}ms`)
    console.log(`  - Plates found: ${result.detection.plates.length}`)

    if (result.detection.plates.length > 0) {
      console.log('\n📍 Plate locations:')
      result.detection.plates.forEach((plate, i) => {
        console.log(`  Plate ${i + 1}:`)
        console.log(`    - Position: (${plate.x.toFixed(1)}%, ${plate.y.toFixed(1)}%)`)
        console.log(`    - Size: ${plate.width.toFixed(1)}% x ${plate.height.toFixed(1)}%`)
        console.log(`    - Confidence: ${(plate.confidence * 100).toFixed(0)}%`)
        console.log(`    - Type: ${plate.plateType}`)
      })
    }

    if (result.blur) {
      console.log('\n🔵 Blur Result:')
      console.log(`  - Success: ${result.blur.success}`)
      console.log(`  - Plates blurred: ${result.blur.platesBlurred}`)

      if (result.blur.blurredBuffer) {
        const outputPath = '/tmp/blurred-car.jpg'
        writeFileSync(outputPath, result.blur.blurredBuffer)
        console.log(`  - Output saved to: ${outputPath}`)
      }

      if (result.blur.error) {
        console.log(`  - Error: ${result.blur.error}`)
      }
    }

    if (result.detection.error) {
      console.log(`\n❌ Detection error: ${result.detection.error}`)
    }

  } catch (error) {
    console.error('❌ Test failed:', error)
    process.exit(1)
  }

  console.log('\n✅ Test complete!')
}

main()
