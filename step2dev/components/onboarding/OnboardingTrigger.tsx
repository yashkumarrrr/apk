'use client'
import { useState, useEffect } from 'react'
import dynamic from 'next/dynamic'

const OnboardingWizard = dynamic(() => import('./OnboardingWizard'), { ssr: false })

interface Props { isNewUser: boolean }

export function OnboardingTrigger({ isNewUser }: Props) {
  const [show, setShow] = useState(false)

  useEffect(() => {
    if (!isNewUser) return
    // Only show if never dismissed before
    const seen = localStorage.getItem('s2d_onboarding_done')
    if (!seen) setShow(true)
  }, [isNewUser])

  function dismiss() {
    localStorage.setItem('s2d_onboarding_done', '1')
    setShow(false)
  }

  if (!show) return null
  return <OnboardingWizard onDismiss={dismiss} />
}
