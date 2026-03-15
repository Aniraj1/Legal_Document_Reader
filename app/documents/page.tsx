import { DocumentChat } from "@/components/document-chat"
import { NavbarControls } from "@/components/navbar-controls"

export default function DocumentsPage() {
  return (
    <div className="h-screen flex flex-col bg-background">
      <header className="shrink-0 py-4 border-b">
        <div className="container mx-auto px-4 flex items-center justify-between">
          <div className="w-5" />
          <h1 className="text-xl font-semibold text-foreground">Legal Document Assistant</h1>
          <NavbarControls />
        </div>
      </header>

      <main className="flex-1 overflow-hidden">
        <DocumentChat />
      </main>
    </div>
  )
}
