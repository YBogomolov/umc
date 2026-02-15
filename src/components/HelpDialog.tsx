import * as React from 'react';

import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

interface HelpDialogProps {
  readonly isOpen: boolean;
  readonly onClose?: () => void;
}

function HelpDialog({ isOpen, onClose }: HelpDialogProps): React.ReactElement | null {
  const handleClose = (): void => {
    onClose?.();
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent className="max-h-[80vh] w-4xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>About this tool</DialogTitle>
        </DialogHeader>

        <div className="space-y-6 -mx-4 max-h-[50vh] overflow-y-auto px-4">
          <p className="text-lg italic text-muted-foreground">
            Universal Miniature Creator helps you create printable paper miniatures for tabletop games using AI image
            generation.
          </p>

          <h2 className="scroll-m-20 border-b pb-2 text-2xl font-semibold tracking-tight first:mt-0">
            Getting Started
          </h2>

          <p className="leading-7">
            The first time you launch the app, you will be asked to provide your Google AI Studio API key. This key is
            stored locally in your browser and is used to generate images via Gemini AI.
          </p>

          <blockquote className="mt-4 border-l-2 pl-4 italic">
            Your API key never leaves your device. It is stored in your browser&apos;s localStorage and used only for
            image generation requests.
          </blockquote>

          <h2 className="scroll-m-20 border-b pb-2 text-2xl font-semibold tracking-tight">How It Works</h2>

          <p className="leading-7">Creating a miniature involves three steps:</p>

          <ol className="my-6 ml-6 list-decimal [&>li]:mt-2">
            <li>
              <strong>Frontal View</strong> — Generate or upload the front-facing image of your character.
            </li>
            <li>
              <strong>Back View</strong> — The app automatically generates a back view that matches the front. You can
              refine it with prompts.
            </li>
            <li>
              <strong>Base</strong> — Generate a top-down base texture for your miniature to stand on.
            </li>
          </ol>

          <h2 className="scroll-m-20 border-b pb-2 text-2xl font-semibold tracking-tight">Collections</h2>

          <p className="leading-7">
            Miniatures are organized into collections. Each collection can have a title and an optional description. The
            description is embedded into AI prompts and helps maintain visual consistency across all miniatures in that
            collection.
          </p>

          <ul className="my-6 ml-6 list-disc [&>li]:mt-2">
            <li>Create new collections using the &quot;New Collection&quot; button in the sidebar.</li>
            <li>Drag and drop miniatures between collections to organize them.</li>
            <li>Download an entire collection as a ZIP file with one click.</li>
            <li>Edit collection details anytime by clicking the pencil icon.</li>
          </ul>

          <h2 className="scroll-m-20 border-b pb-2 text-2xl font-semibold tracking-tight">Upload Your Own Images</h2>

          <p className="leading-7">
            You can upload your own front-facing images instead of generating them. Simply drag and drop an image onto
            the empty generation area, or click to select a file. Supported formats: JPG, PNG, WebP (max 5MB).
          </p>

          <h2 className="scroll-m-20 border-b pb-2 text-2xl font-semibold tracking-tight">Attach Reference Images</h2>

          <p className="leading-7">
            For both front and back views, you can attach reference images to guide the AI. Click the plus (+) button
            next to the prompt area to add images. These attachments are sent along with your text prompt but are not
            stored—they are one-time use only.
          </p>

          <h2 className="scroll-m-20 border-b pb-2 text-2xl font-semibold tracking-tight">Managing Your Miniatures</h2>

          <ul className="my-6 ml-6 list-disc [&>li]:mt-2">
            <li>
              <strong>Naming:</strong> Each miniature has a name that you can edit at the top of the generation screen.
              Names are auto-generated but fully customizable.
            </li>
            <li>
              <strong>Gallery:</strong> All generated images are kept in a gallery. You can switch between different
              versions and delete unwanted ones.
            </li>
            <li>
              <strong>Download:</strong> Hover over any image to see a download button. Individual images are named
              &quot;{'{MiniName} - {View}.{ext}'}&quot;.
            </li>
            <li>
              <strong>Delete:</strong> Click the X on any image thumbnail to remove it. Your miniatures and collections
              can also be deleted from the sidebar.
            </li>
          </ul>

          <h2 className="scroll-m-20 border-b pb-2 text-2xl font-semibold tracking-tight">Tips for Best Results</h2>

          <ul className="my-6 ml-6 list-disc [&>li]:mt-2">
            <li>Be specific in your prompts. Describe clothing, pose, weapons, and style.</li>
            <li>Use the collection description to establish shared visual themes.</li>
            <li>Generate multiple variations and pick the best one from the gallery.</li>
            <li>For back views, the AI uses the front image as reference—keep the character consistent.</li>
            <li>Base textures work best with environmental details like grass, stone, or metal patterns.</li>
          </ul>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export { HelpDialog };
