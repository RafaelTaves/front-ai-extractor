// pages/prompts/index.tsx
"use client"
import React, { useEffect, useState, useCallback } from 'react';
import Head from 'next/head';
import { getPrompts, createPrompt, updatePrompt, deletePrompt, Prompt } from '../../lib/api';
import PromptForm from '../../components/PromptForm';
import PromptItem from '../../components/PromptItem';
import { Button } from '../../components/ui/button';
import { Loader2, PlusCircle } from 'lucide-react';
import { toast } from 'sonner';
import Navbar from '@/components/Navbar';
import { useRouter } from 'next/navigation';

const PromptsPage: React.FC = () => {
  const [prompts, setPrompts] = useState<Prompt[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingPrompt, setEditingPrompt] = useState<Prompt | null>(null);
  const [loadingPage, setLoadingPage] = useState(true);
  const router = useRouter();

  useEffect(() => {
      const verifyToken = async () => {
        const token = localStorage.getItem('token');
        try {
          const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/verify-token/${token}`);
  
          if (!response.ok) {
            throw new Error('Token verification failed');
          }
          setLoadingPage(false)
        } catch (error) {
          localStorage.removeItem('token');
          router.push('/');
        }
      };
  
      verifyToken();
    }, [router]);

  // Função para carregar os prompts da API
  const fetchPrompts = useCallback(async () => {
    if(loadingPage === true) return;
    setLoading(true);
    setError(null);
    try {
      const data = await getPrompts();
      setPrompts(data);
    } catch (err) {
      setError('Falha ao carregar os prompts. Verifique a URL da API e a conexão.');
      console.error('Erro ao buscar prompts:', err);
      toast.error('Erro', { description: 'Falha ao carregar os prompts.' });
    } finally {
      setLoading(false);
    }
  }, [loadingPage]);

  // Carrega os prompts na montagem do componente
  useEffect(() => {
    fetchPrompts();
  }, [fetchPrompts]);

  // Handler para criar um novo prompt
  const handleCreatePrompt = async (newPromptData: Omit<Prompt, 'id_prompt'>) => {
    try {
      await createPrompt(newPromptData);
      setShowCreateForm(false); // Esconde o formulário
      await fetchPrompts(); // Recarrega a lista
      toast.success('Sucesso!', { description: 'Prompt criado com sucesso.' });
    } catch (err) {
      setError('Erro ao criar prompt. Tente novamente.');
      console.error('Erro ao criar prompt:', err);
      toast.error('Erro', { description: 'Falha ao criar prompt.' });
    }
  };

  // Handler para atualizar um prompt existente
  const handleUpdatePrompt = async (updatedData: Omit<Prompt, 'id_prompt'>) => {
    if (!editingPrompt) return; // Não deve acontecer se estiver no modo de edição

    try {
      await updatePrompt(editingPrompt.id_prompt, updatedData);
      setEditingPrompt(null); // Esconde o formulário de edição
      await fetchPrompts(); // Recarrega a lista
      toast.success('Sucesso!', { description: 'Prompt atualizado com sucesso.' });
    } catch (err) {
      setError('Erro ao atualizar prompt. Tente novamente.');
      console.error('Erro ao atualizar prompt:', err);
      toast.error('Erro', { description: 'Falha ao atualizar prompt.' });
    }
  };

  // Handler para deletar um prompt
  const handleDeletePrompt = async (id: number) => {
    if (window.confirm('Tem certeza que deseja deletar este prompt?')) {
      try {
        await deletePrompt(id);
        await fetchPrompts(); // Recarrega a lista
        toast.success('Sucesso!', { description: 'Prompt deletado com sucesso.' });
      } catch (err) {
        setError('Erro ao deletar prompt. Tente novamente.');
        console.error('Erro ao deletar prompt:', err);
        toast.error('Erro', { description: 'Falha ao deletar prompt.' });
      }
    }
  };

  // Funções auxiliares para gerenciar o estado dos formulários
  const handleEditClick = (prompt: Prompt) => {
    setEditingPrompt(prompt);
    setShowCreateForm(false); // Fecha o form de criação se estiver aberto
  };

  const handleCancelEdit = () => {
    setEditingPrompt(null);
  };

  const handleShowCreateForm = () => {
    setShowCreateForm(true);
    setEditingPrompt(null); // Fecha o form de edição se estiver aberto
  };

  if (loading) {
    return <div>{null}</div>;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-4">
        <Navbar />
      <Head>
        <title>Gerenciamento de Prompts</title>
      </Head>

      <div className="max-w-6xl mx-auto space-y-8">
        <h1 className="text-4xl font-bold text-center bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
          Gerenciamento de Prompts
        </h1>

        {/* Formulários de Criação/Edição */}
        {showCreateForm && (
          <PromptForm onSubmit={handleCreatePrompt} onCancel={() => setShowCreateForm(false)} />
        )}

        {editingPrompt && (
          <PromptForm
            initialData={editingPrompt}
            onSubmit={handleUpdatePrompt}
            onCancel={handleCancelEdit}
            isEdit
          />
        )}

        {/* Botão de Adicionar Novo Prompt (mostra se nenhum formulário estiver aberto) */}
        {!showCreateForm && !editingPrompt && (
          <div className="flex justify-center">
            <Button onClick={handleShowCreateForm} className="bg-green-600 hover:bg-green-700 text-white flex items-center gap-2 px-6 py-3">
              <PlusCircle className="h-5 w-5" /> Adicionar Novo Prompt
            </Button>
          </div>
        )}

        {/* Exibição de Status (Carregando/Erro) */}
        {loading && (
          <div className="flex items-center justify-center text-blue-600 text-lg">
            <Loader2 className="mr-2 h-6 w-6 animate-spin" /> Carregando prompts...
          </div>
        )}

        {error && (
          <div className="p-4 bg-red-100 border border-red-400 text-red-700 rounded-lg text-center">
            <p className="font-semibold">Erro:</p>
            <p>{error}</p>
          </div>
        )}

        {/* Lista de Prompts */}
        <h2 className="text-3xl font-bold text-slate-700 mb-6 border-b pb-2">
          {prompts.length} Prompts Cadastrados
        </h2>
        
        {!loading && !error && prompts.length === 0 && (
          <p className="text-center text-slate-500 text-lg">Nenhum prompt encontrado. Comece adicionando um!</p>
        )}

        <div className="space-y-4">
          {prompts.map((prompt) => (
            <PromptItem
              key={prompt.id_prompt}
              prompt={prompt}
              onEdit={handleEditClick}
              onDelete={handleDeletePrompt}
            />
          ))}
        </div>
      </div>
    </div>
  );
};

export default PromptsPage;