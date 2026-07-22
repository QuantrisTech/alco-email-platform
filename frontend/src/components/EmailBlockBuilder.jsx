import { useState } from "react";
import { GripVertical, Type, Image as ImageIcon, Square, Trash2, Plus } from "lucide-react";

const BLOCK_TYPES = {
  text: { label: "Text", icon: Type },
  image: { label: "Image", icon: ImageIcon },
  button: { label: "Button", icon: Square },
};

function blockToHtml(block) {
  if (block.type === "text") return `<p>${block.content}</p>`;
  if (block.type === "image") return `<img src="${block.content}" style="max-width:100%" />`;
  if (block.type === "button") {
    return `<a href="${block.url || '#'}" style="display:inline-block;background:#F8B821;color:#071C43;padding:10px 20px;border-radius:6px;text-decoration:none;font-weight:600;">${block.content}</a>`;
  }
  return "";
}

export default function EmailBlockBuilder({ initialBody = "", onChange }) {
  const [blocks, setBlocks] = useState(
    initialBody ? [{ id: "1", type: "text", content: initialBody }] : []
  );
  const [dragIndex, setDragIndex] = useState(null);

  function emit(updated) {
    setBlocks(updated);
    onChange(updated.map(blockToHtml).join("\n"));
  }

  function addBlock(type) {
    const newBlock = { id: Date.now().toString(), type, content: "", url: "" };
    emit([...blocks, newBlock]);
  }

  function updateBlock(id, patch) {
    emit(blocks.map((b) => (b.id === id ? { ...b, ...patch } : b)));
  }

  function removeBlock(id) {
    emit(blocks.filter((b) => b.id !== id));
  }

  function handleDragStart(index) {
    setDragIndex(index);
  }

  function handleDrop(index) {
    if (dragIndex === null || dragIndex === index) return;
    const updated = [...blocks];
    const [moved] = updated.splice(dragIndex, 1);
    updated.splice(index, 0, moved);
    setDragIndex(null);
    emit(updated);
  }

  return (
    <div className="border border-border rounded-lg overflow-hidden">
      <div className="flex gap-2 p-3 bg-muted/40 border-b border-border">
        {Object.entries(BLOCK_TYPES).map(([type, { label, icon: Icon }]) => (
          <button
            key={type}
            type="button"
            onClick={() => addBlock(type)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-border bg-card text-xs font-medium text-foreground hover:bg-muted transition"
          >
            <Plus className="size-3.5" />
            <Icon className="size-3.5" />
            {label}
          </button>
        ))}
      </div>

      <div className="p-3 space-y-2 min-h-[120px] bg-background">
        {blocks.length === 0 && (
          <p className="text-sm text-muted-foreground text-center py-8">
            Add a block above to start building your email.
          </p>
        )}

        {blocks.map((block, index) => {
          const { icon: Icon } = BLOCK_TYPES[block.type];
          return (
            <div
              key={block.id}
              draggable
              onDragStart={() => handleDragStart(index)}
              onDragOver={(e) => e.preventDefault()}
              onDrop={() => handleDrop(index)}
              className="flex items-start gap-2 p-3 rounded-lg border border-border bg-card"
            >
              <GripVertical className="size-4 text-muted-foreground mt-1 cursor-grab shrink-0" />
              <Icon className="size-4 text-muted-foreground mt-1 shrink-0" />

              <div className="flex-1 space-y-2">
                {block.type === "text" && (
                  <textarea
                    value={block.content}
                    onChange={(e) => updateBlock(block.id, { content: e.target.value })}
                    placeholder="Hi {name}, ..."
                    rows={3}
                    className="w-full px-2 py-1.5 rounded-md border border-border text-sm outline-none focus:border-ring resize-none"
                  />
                )}
                {block.type === "image" && (
                  <input
                    value={block.content}
                    onChange={(e) => updateBlock(block.id, { content: e.target.value })}
                    placeholder="Image URL"
                    className="w-full px-2 py-1.5 rounded-md border border-border text-sm outline-none focus:border-ring"
                  />
                )}
                {block.type === "button" && (
                  <>
                    <input
                      value={block.content}
                      onChange={(e) => updateBlock(block.id, { content: e.target.value })}
                      placeholder="Button text"
                      className="w-full px-2 py-1.5 rounded-md border border-border text-sm outline-none focus:border-ring"
                    />
                    <input
                      value={block.url}
                      onChange={(e) => updateBlock(block.id, { url: e.target.value })}
                      placeholder="Button URL"
                      className="w-full px-2 py-1.5 rounded-md border border-border text-sm outline-none focus:border-ring"
                    />
                  </>
                )}
              </div>

              <button
                type="button"
                onClick={() => removeBlock(block.id)}
                className="text-muted-foreground hover:text-destructive shrink-0"
              >
                <Trash2 className="size-4" />
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}