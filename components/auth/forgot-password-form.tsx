
"use client"

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useToast } from '@/hooks/use-toast'
import { Mail, ArrowLeft, Copy, Check } from 'lucide-react'
import Link from 'next/link'

export function ForgotPasswordForm() {
  const [email, setEmail] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [resetLink, setResetLink] = useState('')
  const [linkCopied, setLinkCopied] = useState(false)
  const { toast } = useToast()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)

    try {
      const response = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email }),
      })

      const data = await response.json()

      if (response.ok) {
        if (data.resetUrl) {
          setResetLink(data.resetUrl)
          toast({
            title: 'Reset Link Generated',
            description: 'Please copy the link below to reset your password.',
          })
        } else {
          toast({
            title: 'Success',
            description: data.message,
          })
        }
      } else {
        toast({
          title: 'Error',
          description: data.error || 'Failed to process request',
          variant: 'destructive',
        })
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Something went wrong. Please try again.',
        variant: 'destructive',
      })
    } finally {
      setIsLoading(false)
    }
  }

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(resetLink)
      setLinkCopied(true)
      toast({
        title: 'Copied!',
        description: 'Reset link copied to clipboard',
      })
      setTimeout(() => setLinkCopied(false), 2000)
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to copy link',
        variant: 'destructive',
      })
    }
  }

  if (resetLink) {
    return (
      <div className="space-y-6">
        <div className="text-center">
          <h3 className="text-lg font-semibold text-green-600 mb-2">Reset Link Generated</h3>
          <p className="text-sm text-gray-600 mb-4">
            Copy the link below and paste it in your browser to reset your password.
            This link will expire in 30 minutes.
          </p>
        </div>

        <div className="bg-gray-50 p-4 rounded-lg border">
          <Label className="text-sm font-medium text-gray-700 mb-2 block">
            Password Reset Link
          </Label>
          <div className="flex gap-2">
            <Input
              value={resetLink}
              readOnly
              className="font-mono text-sm bg-white"
            />
            <Button
              onClick={copyToClipboard}
              variant="outline"
              size="sm"
              className="shrink-0"
            >
              {linkCopied ? (
                <Check className="h-4 w-4 text-green-600" />
              ) : (
                <Copy className="h-4 w-4" />
              )}
            </Button>
          </div>
        </div>

        <div className="space-y-3">
          <Button
            onClick={() => {
              setResetLink('')
              setEmail('')
            }}
            variant="outline"
            className="w-full"
          >
            Generate Another Link
          </Button>
          
          <Link href="/auth/signin">
            <Button variant="ghost" className="w-full">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Sign In
            </Button>
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h3 className="text-lg font-semibold text-gray-900 mb-2">Forgot Password?</h3>
        <p className="text-sm text-gray-600">
          Enter your email address and we'll generate a password reset link for you.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="email">Email Address</Label>
          <div className="relative">
            <Mail className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Enter your email address"
              className="pl-10"
              required
            />
          </div>
        </div>

        <Button 
          type="submit" 
          className="w-full bg-blue-600 hover:bg-blue-700" 
          disabled={isLoading}
        >
          {isLoading ? 'Generating Link...' : 'Generate Reset Link'}
        </Button>
      </form>

      <div className="text-center">
        <Link href="/auth/signin">
          <Button variant="ghost" className="text-sm">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Sign In
          </Button>
        </Link>
      </div>
    </div>
  )
}
