// components/PromptForm.tsx
import React, { useState, useEffect } from 'react';
import { Prompt } from '../lib/api'; // Importe a interface Prompt
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Textarea } from './ui/textarea';
import { Label } from './ui/label';

interface PromptFormProps {
  initialData?: Prompt | null; // Dados iniciais para edição
  onSubmit: (data: Omit<Prompt, 'id_prompt'>) => void; // Função ao submeter
  onCancel?: () => void; // Função ao cancelar (apenas em edição/criação separada)
  isEdit?: boolean; // Flag para indicar modo de edição
}

const PromptForm: React.FC<PromptFormProps> = ({ initialData, onSubmit, onCancel, isEdit = false }) => {
  const [chave, setChave] = useState(initialData?.chave || '');
  const [texto, setTexto] = useState(initialData?.texto || '');

  // Preenche o formulário quando initialData muda (no modo de edição)
  useEffect(() => {
    if (initialData) {
      setChave(initialData.chave);
      setTexto(initialData.texto);
    } else { // Limpa se não há dados iniciais (modo de criação)
      setChave('');
      setTexto('');
    }
  }, [initialData]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Chame a função onSubmit com os dados do formulário
    onSubmit({ chave, texto });

    // Limpa o formulário após a criação, mas não na edição
    if (!isEdit) {
      setChave('');
      setTexto('');
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 p-6 border rounded-lg shadow-sm bg-white">
      <h3 className="text-xl font-semibold text-slate-800">{isEdit ? 'Editar Prompt' : 'Criar Novo Prompt'}</h3>
      <div>
        <Label htmlFor="chave">Chave do Prompt</Label>
        <Input
          id="chave"
          type="text"
          value={chave}
          onChange={(e) => setChave(e.target.value)}
          placeholder="Ex: summarize_text, extract_entities"
          required
        />
      </div>
      <div>
        <Label htmlFor="texto">Conteúdo do Prompt</Label>
        <Textarea
          id="texto"
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
          placeholder="Escreva o texto completo do prompt aqui..."
          rows={6}
          required
        />
      </div>
      <div className="flex justify-end space-x-2">
        <Button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white">
          {isEdit ? 'Salvar Alterações' : 'Criar Prompt'}
        </Button>
        {onCancel && ( // Botão de cancelar só aparece se a função for fornecida
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancelar
          </Button>
        )}
      </div>
    </form>
  );
};

export default PromptForm;