'use client'

import { Button } from '@/components/ui/button'

type LegalDocumentType = 'terms' | 'privacy'

type LegalDocumentsModalProps = {
  isOpen: boolean
  documentType: LegalDocumentType
  onClose: () => void
}

const EFFECTIVE_DATE = 'April 13, 2026'

export function LegalDocumentsModal({
  isOpen,
  documentType,
  onClose,
}: LegalDocumentsModalProps) {
  if (!isOpen) {
    return null
  }

  const isTerms = documentType === 'terms'
  const title = isTerms ? 'Terms of Service' : 'Privacy Policy'

  return (
    <div
      className="fixed inset-0 z-[100] bg-black/60"
      role="dialog"
      aria-modal="true"
      aria-labelledby="legal-document-title"
      onClick={onClose}
    >
      <div
        className="absolute left-1/2 top-1/2 w-[min(92vw,52rem)] -translate-x-1/2 -translate-y-1/2 rounded-lg border bg-card text-card-foreground shadow-lg"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="border-b px-6 py-4">
          <h3 id="legal-document-title" className="text-xl font-semibold">
            {title}
          </h3>
          <p className="text-sm text-muted-foreground">Effective Date: {EFFECTIVE_DATE}</p>
        </div>

        <div className="max-h-[65vh] space-y-6 overflow-y-auto px-6 py-4 text-sm leading-6">
          {isTerms ? <TermsContent /> : <PrivacyContent />}
        </div>

        <div className="flex justify-end border-t px-6 py-4">
          <Button type="button" onClick={onClose}>
            Close
          </Button>
        </div>
      </div>
    </div>
  )
}

function TermsContent() {
  return (
    <>
      <section className="space-y-2">
        <h4 className="text-base font-semibold">1. Agreement to Terms</h4>
        <p>
          By creating an account, accessing, or using Legal Document Assistant (the "Service"), you
          agree to be bound by these Terms of Service. If you do not agree, do not use the Service.
        </p>
      </section>

      <section className="space-y-2">
        <h4 className="text-base font-semibold">2. Eligibility and Account Responsibility</h4>
        <p>
          You must provide accurate registration information and keep your credentials secure. You are
          responsible for all activity under your account and must notify us immediately of any
          unauthorized access.
        </p>
      </section>

      <section className="space-y-2">
        <h4 className="text-base font-semibold">3. Permitted Use</h4>
        <p>
          The Service is intended for lawful document management, analysis, retrieval, and related
          research workflows. You agree not to misuse the Service, interfere with security, attempt
          unauthorized access, or upload unlawful or harmful content.
        </p>
      </section>

      <section className="space-y-2">
        <h4 className="text-base font-semibold">4. User Content and Uploaded Documents</h4>
        <p>
          You retain ownership of documents and other content you upload. You grant us a limited,
          non-exclusive license to process, store, index, and display your content solely to operate,
          maintain, and improve the Service for you.
        </p>
      </section>

      <section className="space-y-2">
        <h4 className="text-base font-semibold">5. Service Availability and Changes</h4>
        <p>
          We may modify, suspend, or discontinue features at any time, with or without notice. We do
          not guarantee uninterrupted availability and are not liable for downtime caused by maintenance,
          network failures, or events outside our control.
        </p>
      </section>

      <section className="space-y-2">
        <h4 className="text-base font-semibold">6. Intellectual Property</h4>
        <p>
          All software, branding, and non-user content in the Service are owned by or licensed to us
          and protected by applicable intellectual property laws. Except as expressly permitted, you may
          not copy, reverse engineer, distribute, or create derivative works from the Service.
        </p>
      </section>

      <section className="space-y-2">
        <h4 className="text-base font-semibold">7. Disclaimer</h4>
        <p>
          The Service provides informational and technical assistance and does not constitute legal
          advice. You are responsible for reviewing outputs and obtaining professional legal counsel when
          needed.
        </p>
      </section>

      <section className="space-y-2">
        <h4 className="text-base font-semibold">8. Limitation of Liability</h4>
        <p>
          To the fullest extent permitted by law, we are not liable for indirect, incidental, special,
          consequential, or punitive damages, or for loss of data, profits, or business opportunities
          arising from your use of the Service.
        </p>
      </section>

      <section className="space-y-2">
        <h4 className="text-base font-semibold">9. Termination</h4>
        <p>
          We may suspend or terminate accounts that violate these Terms or create risk to the Service,
          users, or third parties. You may stop using the Service at any time.
        </p>
      </section>

      <section className="space-y-2">
        <h4 className="text-base font-semibold">10. Updates to These Terms</h4>
        <p>
          We may update these Terms periodically. Material changes will be reflected by an updated
          effective date. Continued use after changes become effective constitutes acceptance of the
          revised Terms.
        </p>
      </section>
    </>
  )
}

function PrivacyContent() {
  return (
    <>
      <section className="space-y-2">
        <h4 className="text-base font-semibold">1. Overview</h4>
        <p>
          This Privacy Policy explains how Legal Document Assistant collects, uses, stores, and protects
          personal information when you use the Service.
        </p>
      </section>

      <section className="space-y-2">
        <h4 className="text-base font-semibold">2. Information We Collect</h4>
        <p>
          We collect account data (such as username and email), authentication data, uploaded documents,
          and usage analytics needed to operate the Service. We may also collect technical metadata such
          as IP address, browser type, and access timestamps.
        </p>
      </section>

      <section className="space-y-2">
        <h4 className="text-base font-semibold">3. How We Use Information</h4>
        <p>
          We use information to provide and secure the Service, authenticate users, process documents,
          improve features, detect abuse, and comply with legal obligations.
        </p>
      </section>

      <section className="space-y-2">
        <h4 className="text-base font-semibold">4. Legal Basis and Consent</h4>
        <p>
          Where required, we process personal data based on consent, contract performance, legitimate
          interests, and legal compliance. By creating an account and selecting the agreement checkbox,
          you consent to this Privacy Policy.
        </p>
      </section>

      <section className="space-y-2">
        <h4 className="text-base font-semibold">5. Data Sharing</h4>
        <p>
          We do not sell personal information. We may share data with trusted service providers that help
          host or operate the Service, subject to confidentiality and security obligations, and with
          authorities when legally required.
        </p>
      </section>

      <section className="space-y-2">
        <h4 className="text-base font-semibold">6. Data Retention</h4>
        <p>
          We retain data for as long as needed to provide the Service, fulfill legal obligations, resolve
          disputes, and enforce agreements. Retention periods may vary by data type and jurisdiction.
        </p>
      </section>

      <section className="space-y-2">
        <h4 className="text-base font-semibold">7. Security</h4>
        <p>
          We apply administrative, technical, and organizational safeguards to protect your data.
          However, no method of transmission or storage is fully secure, and absolute security cannot be
          guaranteed.
        </p>
      </section>

      <section className="space-y-2">
        <h4 className="text-base font-semibold">8. Your Rights</h4>
        <p>
          Depending on applicable law, you may have rights to access, correct, delete, or restrict use of
          your personal information, and to withdraw consent where processing is consent-based.
        </p>
      </section>

      <section className="space-y-2">
        <h4 className="text-base font-semibold">9. Children&apos;s Privacy</h4>
        <p>
          The Service is not intended for children under 13, and we do not knowingly collect personal
          information from children under 13.
        </p>
      </section>

      <section className="space-y-2">
        <h4 className="text-base font-semibold">10. Changes to This Policy</h4>
        <p>
          We may update this Privacy Policy from time to time. Changes will be posted in the Service with
          an updated effective date. Continued use after updates indicates acceptance of the revised
          policy.
        </p>
      </section>
    </>
  )
}
