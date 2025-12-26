'use client'

import ReactMarkdown from 'react-markdown'
import { ExternalLink } from 'lucide-react'
import { cn } from '@/lib/utils'

type MarkdownProps = {
  content: string
  className?: string
}

/**
 * Sanitize URLs to prevent XSS attacks via javascript: protocol
 * Only allow http:, https:, and mailto: protocols
 */
function sanitizeUrl(url: string): string {
  try {
    const parsed = new URL(url, window.location.origin)
    const allowedProtocols = ['http:', 'https:', 'mailto:']

    if (allowedProtocols.includes(parsed.protocol)) {
      return url
    }

    // Block dangerous protocols like javascript:, data:, vbscript:, etc.
    return '#'
  } catch {
    // Invalid URL, return safe fallback
    return '#'
  }
}

export function Markdown({ content, className }: MarkdownProps) {
  return (
    <div
      className={cn(
        'prose prose-sm max-w-none dark:prose-invert',
        // Headings
        'prose-headings:font-heading prose-headings:tracking-tight',
        'prose-h1:text-xl prose-h2:text-lg prose-h3:text-base prose-h4:text-sm',
        'prose-h1:mt-4 prose-h2:mt-3 prose-h3:mt-2',
        // Paragraphs
        'prose-p:leading-relaxed prose-p:text-foreground/90',
        // Lists
        'prose-ul:my-2 prose-ol:my-2',
        'prose-li:my-0.5 prose-li:marker:text-primary',
        // Strong/Bold
        'prose-strong:font-semibold prose-strong:text-foreground',
        // Links
        'prose-a:text-primary prose-a:no-underline hover:prose-a:underline',
        'prose-a:inline-flex prose-a:items-center prose-a:gap-1',
        // Code
        'prose-code:rounded prose-code:bg-muted prose-code:px-1 prose-code:py-0.5 prose-code:text-sm',
        'prose-code:before:content-none prose-code:after:content-none',
        className
      )}
    >
      <ReactMarkdown
        urlTransform={sanitizeUrl}
        components={{
          a: ({ href, children, ...props }) => {
            const isExternal = href && (href.startsWith('http://') || href.startsWith('https://'))

            return (
              <a
                href={href}
                target={isExternal ? '_blank' : undefined}
                rel={isExternal ? 'noopener noreferrer' : undefined}
                {...props}
              >
                {children}
                {isExternal && (
                  <ExternalLink className="inline h-3 w-3" aria-label="(opens in new tab)" />
                )}
              </a>
            )
          },
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  )
}
