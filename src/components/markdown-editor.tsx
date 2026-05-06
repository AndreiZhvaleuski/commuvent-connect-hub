import { useEffect } from "react";
import { useEditor, EditorContent, type Editor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";
import { Markdown } from "tiptap-markdown";
import {
  TextBIcon as Bold,
  TextItalicIcon as Italic,
  TextStrikethroughIcon as Strikethrough,
  ListBulletsIcon as List,
  ListNumbersIcon as ListOrdered,
  QuotesIcon as Quote,
  CodeIcon as Code,
  ArrowUUpLeftIcon as Undo,
  ArrowUUpRightIcon as Redo,
} from "@phosphor-icons/react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

type Props = {
  value: string;
  onChange: (markdown: string) => void;
  placeholder?: string;
  className?: string;
};

export function MarkdownEditor({ value, onChange, placeholder, className }: Props) {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({ heading: false, link: false }),
      Placeholder.configure({ placeholder: placeholder ?? "Write something…" }),
      Markdown.configure({ html: false, linkify: false, breaks: true, transformPastedText: true }),
    ],
    content: value || "",
    editorProps: {
      attributes: {
        class:
          "tiptap-content min-h-[10rem] px-3 py-2 text-sm outline-none focus:outline-none",
      },
    },
    onUpdate: ({ editor }) => {
      const md = (editor.storage as unknown as { markdown?: { getMarkdown?: () => string } }).markdown?.getMarkdown?.() ?? "";
      onChange(md);
    },
  });

  useEffect(() => {
    if (!editor) return;
    const current = (editor.storage as unknown as { markdown?: { getMarkdown?: () => string } }).markdown?.getMarkdown?.() ?? "";
    if (value !== current) {
      editor.commands.setContent(value || "", { emitUpdate: false });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, editor]);

  if (!editor) return null;

  return (
    <div className={cn("rounded-lg border bg-background", className)}>
      <Toolbar editor={editor} />
      <EditorContent editor={editor} />
    </div>
  );
}

function Toolbar({ editor }: { editor: Editor }) {
  return (
    <div className="flex flex-wrap items-center gap-0.5 border-b px-1 py-1">
      <ToolBtn active={editor.isActive("bold")} onClick={() => editor.chain().focus().toggleBold().run()} label="Bold"><Bold className="h-4 w-4" /></ToolBtn>
      <ToolBtn active={editor.isActive("italic")} onClick={() => editor.chain().focus().toggleItalic().run()} label="Italic"><Italic className="h-4 w-4" /></ToolBtn>
      <ToolBtn active={editor.isActive("strike")} onClick={() => editor.chain().focus().toggleStrike().run()} label="Strikethrough"><Strikethrough className="h-4 w-4" /></ToolBtn>
      <Sep />
      <ToolBtn active={editor.isActive("bulletList")} onClick={() => editor.chain().focus().toggleBulletList().run()} label="Bullet list"><List className="h-4 w-4" /></ToolBtn>
      <ToolBtn active={editor.isActive("orderedList")} onClick={() => editor.chain().focus().toggleOrderedList().run()} label="Numbered list"><ListOrdered className="h-4 w-4" /></ToolBtn>
      <ToolBtn active={editor.isActive("blockquote")} onClick={() => editor.chain().focus().toggleBlockquote().run()} label="Quote"><Quote className="h-4 w-4" /></ToolBtn>
      <ToolBtn active={editor.isActive("codeBlock")} onClick={() => editor.chain().focus().toggleCodeBlock().run()} label="Code block"><Code className="h-4 w-4" /></ToolBtn>
      <Sep />
      <ToolBtn onClick={() => editor.chain().focus().undo().run()} label="Undo"><Undo className="h-4 w-4" /></ToolBtn>
      <ToolBtn onClick={() => editor.chain().focus().redo().run()} label="Redo"><Redo className="h-4 w-4" /></ToolBtn>
    </div>
  );
}

function ToolBtn({ children, onClick, active, label }: { children: React.ReactNode; onClick: () => void; active?: boolean; label: string }) {
  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      aria-label={label}
      title={label}
      onClick={onClick}
      className={cn("h-8 w-8 p-0", active && "bg-accent text-accent-foreground")}
    >
      {children}
    </Button>
  );
}

function Sep() {
  return <span className="mx-1 h-5 w-px bg-border" />;
}

