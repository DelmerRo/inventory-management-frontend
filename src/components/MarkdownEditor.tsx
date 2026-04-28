import React, { useState } from 'react';

interface MarkdownEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

const MarkdownEditor: React.FC<MarkdownEditorProps> = ({ value, onChange, placeholder }) => {
  const [showPreview, setShowPreview] = useState(false);

  const handleFormat = (type: 'bold' | 'italic' | 'title' | 'list' | 'link') => {
    const textarea = document.getElementById('markdown-textarea') as HTMLTextAreaElement;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = value.substring(start, end);
    let newText = '';
    let cursorOffset = 0;

    switch (type) {
      case 'bold':
        newText = `**${selectedText || 'texto en negrita'}**`;
        cursorOffset = selectedText ? newText.length : 2;
        break;
      case 'italic':
        newText = `*${selectedText || 'texto en cursiva'}*`;
        cursorOffset = selectedText ? newText.length : 1;
        break;
      case 'title':
        newText = `## ${selectedText || 'Título'}`;
        cursorOffset = selectedText ? newText.length : 3;
        break;
      case 'list':
        newText = `- ${selectedText || 'ítem de lista'}`;
        cursorOffset = selectedText ? newText.length : 2;
        break;
      case 'link':
        newText = `[${selectedText || 'texto del enlace'}](url)`;
        cursorOffset = selectedText ? newText.length : 4;
        break;
    }

    const finalText = value.substring(0, start) + newText + value.substring(end);
    onChange(finalText);

    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + cursorOffset, start + cursorOffset);
    }, 0);
  };

  const renderMarkdown = (text: string) => {
    let html = text
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.*?)\*/g, '<em>$1</em>')
      .replace(/## (.*?)(\n|$)/g, '<h2 class="text-lg font-bold mt-2 mb-1">$1</h2>')
      .replace(/- (.*?)(\n|$)/g, '<li class="ml-4">$1</li>')
      .replace(/\[(.*?)\]\((.*?)\)/g, '<a href="$2" class="text-blue-600 hover:underline" target="_blank">$1</a>')
      .replace(/\n/g, '<br/>');
    
    return <div dangerouslySetInnerHTML={{ __html: html }} />;
  };

  return (
    <div className="border border-gray-300 rounded-md overflow-hidden">
      <div className="flex gap-1 p-2 bg-gray-50 border-b border-gray-300 flex-wrap">
        <button
          type="button"
          onClick={() => handleFormat('bold')}
          className="px-2 py-1 text-sm font-bold rounded hover:bg-gray-200"
          title="Negrita (**texto**)">
          B
        </button>
        <button
          type="button"
          onClick={() => handleFormat('italic')}
          className="px-2 py-1 text-sm italic rounded hover:bg-gray-200"
          title="Cursiva (*texto*)">
          I
        </button>
        <button
          type="button"
          onClick={() => handleFormat('title')}
          className="px-2 py-1 text-sm rounded hover:bg-gray-200"
          title="Título (## Título)">
          H2
        </button>
        <button
          type="button"
          onClick={() => handleFormat('list')}
          className="px-2 py-1 text-sm rounded hover:bg-gray-200"
          title="Lista (- texto)">
          • Lista
        </button>
        <button
          type="button"
          onClick={() => handleFormat('link')}
          className="px-2 py-1 text-sm rounded hover:bg-gray-200"
          title="Enlace [texto](url)">
          🔗
        </button>
        <div className="w-px h-6 bg-gray-300 mx-1" />
        <button
          type="button"
          onClick={() => setShowPreview(!showPreview)}
          className={`px-2 py-1 text-sm rounded ${showPreview ? 'bg-blue-100 text-blue-700' : 'hover:bg-gray-200'}`}>
          {showPreview ? '✏️ Editar' : '👁️ Vista previa'}
        </button>
      </div>

      {!showPreview ? (
        <textarea
          id="markdown-textarea"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          rows={6}
          className="w-full px-3 py-2 focus:outline-none font-mono text-sm"
        />
      ) : (
        <div className="p-3 min-h-[150px] bg-gray-50 prose prose-sm max-w-none">
          {value ? renderMarkdown(value) : <span className="text-gray-400">Sin contenido</span>}
        </div>
      )}
    </div>
  );
};

export default MarkdownEditor;