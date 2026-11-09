import { useState } from 'react';

export default function useCopyToClipboard() {
  const [copiedKeyId, setCopiedKeyId] = useState(null);

  const copyToClipboard = (text, id) => {
    navigator.clipboard.writeText(text);
    setCopiedKeyId(id);
    setTimeout(() => setCopiedKeyId(null), 2000);
  };

  return { copiedKeyId, copyToClipboard };
}
