// components/PromptItem.tsx
import React from 'react';
import { Prompt } from '../lib/api'; // Importe a interface Prompt
import { Button } from './ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Edit, Trash2 } from 'lucide-react';

interface PromptItemProps {
  prompt: Prompt;
  onEdit: (prompt: Prompt) => void;
  onDelete: (id_prompt: number) => void;
}

const PromptItem: React.FC<PromptItemProps> = ({ prompt, onEdit, onDelete }) => {
  return (
    <Card className="flex flex-col md:flex-row justify-between items-start md:items-center p-4 shadow-sm hover:shadow-md transition-shadow">
      <CardHeader className="flex-grow p-0 mb-4 md:mb-0">
        <CardTitle className="text-lg font-semibold text-slate-800">{prompt.chave}</CardTitle>
        <CardDescription className="text-sm text-slate-600 max-w-lg truncate">
          ID: {prompt.id_prompt}
        </CardDescription>
        <div className="mt-2 p-2 bg-slate-50 border border-slate-200 rounded-md text-sm text-slate-700 whitespace-pre-wrap max-h-32 overflow-auto">
          {prompt.texto}
        </div>
      </CardHeader>
      <CardContent className="flex flex-col md:flex-row gap-2 p-0">
        <Button variant="outline" size="sm" onClick={() => onEdit(prompt)} className="flex items-center gap-1">
          <Edit className="h-4 w-4" /> Editar
        </Button>
        <Button variant="destructive" size="sm" onClick={() => onDelete(prompt.id_prompt)} className="flex items-center gap-1">
          <Trash2 className="h-4 w-4" /> Deletar
        </Button>
      </CardContent>
    </Card>
  );
};

export default PromptItem;