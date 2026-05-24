import OnboardingShell from '@/components/chat/OnboardingShell'

export default function StartPreview() {
  return (
    <div className="fixed inset-0">
      <OnboardingShell userId="preview" initialMessages={[]} />
    </div>
  )
}
