'use client'

import React, { useState, useCallback, useEffect, useRef } from 'react'
import { Upload, Download, Copy, FileText, Image, Check, X, Key, Eye, EyeOff, Shield, Save } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { toast } from 'sonner'
import axios from 'axios'
import { Input } from '@/components/ui/input'
import { useRouter } from 'next/navigation';
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { convertCSV, convertINSERT, updatePrompt } from '@/lib/api'
import Navbar from '@/components/Navbar'

interface Prompt {
  id_prompt: number;
  chave: string;
  texto: string;
}

export default function FileProcessorPage() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [prompts, setPrompts] = useState<Prompt[]>([])
  const [selectedPrompt, setSelectedPrompt] = useState<number>(0)
  const [apiKey, setApiKey] = useState<string>('')
  const [showApiKey, setShowApiKey] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)
  const [result, setResult] = useState<any>(null)
  const [isDragOver, setIsDragOver] = useState(false)
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const [currentPromptText, setCurrentPromptText] = useState<string>("")
  const [taskId, setTaskId] = useState<string | null>(null);
  const [percent, setPercent] = useState(0);
  const [status, setStatus] = useState<"idle" | "queued" | "running" | "done" | "error">("idle");
  const [processed, setProcessed] = useState(0);
  const [total, setTotal] = useState(0);
  const pollRef = useRef<number | null>(null);

  useEffect(() => {
    const verifyToken = async () => {
      const token = localStorage.getItem('token');
      try {
        const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/verify-token/${token}`);
        if (!response.ok) throw new Error('Token verification failed');
        setLoading(false)
      } catch (error) {
        localStorage.removeItem('token');
        router.push('/');
      }
    };
    verifyToken();
  }, [router]);

  useEffect(() => {
    const fetchPrompts = async () => {
      if (loading) return;
      try {
        const response = await axios.get(`${process.env.NEXT_PUBLIC_API_URL}/prompts_read_list`, {
          headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
        });
        setPrompts(response.data);
        if (response.data.length > 0) {
          // FIX: usa id_prompt
          setSelectedPrompt(response.data[0].id_prompt);
        }
      } catch {
        toast.error('Erro ao carregar prompts', { description: 'Não foi possível carregar os prompts disponíveis.' });
      }
    };
    fetchPrompts();
    const apiKey = localStorage.getItem('api_key');
    if (apiKey) setApiKey(apiKey);
  }, [loading]);

  useEffect(() => {
    if (selectedPrompt) {
      const prompt = prompts.find(p => p.id_prompt === selectedPrompt)
      setCurrentPromptText(prompt?.texto || "")
    } else {
      setCurrentPromptText("")
    }
  }, [selectedPrompt, prompts])

  useEffect(() => {
    const token = localStorage.getItem('token') || '';
    if (!taskId) return;

    // Inicia polling a cada 1s
    pollRef.current = window.setInterval(() => pollProgress(token), 1000);

    return () => {
      if (pollRef.current) {
        window.clearInterval(pollRef.current);
        pollRef.current = null;
      }
    };
  }, [taskId]);


  const isZipFile = (file: File) => {
    const type = (file.type || '').toLowerCase();
    const name = (file.name || '').toLowerCase();
    return (
      type === 'application/zip' ||
      type === 'application/x-zip-compressed' ||
      name.endsWith('.zip')
    );
  };

  // input file (se usar)
  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) processSelectedFile(file)
  }

  // drag & drop
  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(false)
    const files = Array.from(e.dataTransfer.files)
    if (files.length > 0) processSelectedFile(files[0])
  }, [])

  const processSelectedFile = (file: File) => {
    const isZip = isZipFile(file)

    // Tipos aceitos para doc/imagem
    const validDocTypes = new Set([
      'application/pdf',
      'image/jpeg',
      'image/jpg',
      'image/png',
      'image/gif',
      'image/webp',
      'image/tiff',
      'image/tif',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    ])

    // tamanho máximo (10MB docs/imagens; 1000MB ZIP)
    const maxSize = isZip ? 1000 * 1024 * 1024 : 20 * 1024 * 1024

    if (!isZip && !validDocTypes.has(file.type)) {
      toast.error('Tipo de arquivo não suportado', {
        description: 'Envie PDF, imagem (JPEG, PNG, GIF, WebP, TIFF) ou ZIP.'
      })
      return
    }

    if (file.size > maxSize) {
      toast.error('Arquivo muito grande', {
        description: isZip ? 'ZIP deve ter no máximo 1000MB' : 'Documento deve ter no máximo 20MB'
      })
      return
    }

    setSelectedFile(file)
    setResult(null)
    toast.success('Arquivo carregado com sucesso!')
  }

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(true)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(false)
  }, [])

  const handleProcess = async () => {
    const token = localStorage.getItem('token');

    if (!selectedFile || !selectedPrompt || !apiKey) {
      toast.error('Dados incompletos', {
        description: 'Selecione um arquivo, um prompt e informe a chave de API.'
      });
      return;
    }

    const isZip = isZipFile(selectedFile);

    // estados iniciais comuns
    setResult(null);
    setIsProcessing(true);

    try {
      const form = new FormData();
      form.append('file', selectedFile);
      form.append('prompt', currentPromptText);
      form.append('api_key', apiKey);

      if (isZip) {
        // NOVO: inicia tarefa e ativa polling de progresso
        const startUrl = `${process.env.NEXT_PUBLIC_API_URL}/extract-zip/start`;
        const { data, status } = await axios.post(startUrl, form, {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (status !== 200 || !data?.task_id) {
          throw new Error('Falha ao iniciar processamento do ZIP');
        }

        setTaskId(data.task_id);
        setStatus('queued');
        setPercent(0);
        setProcessed(0);
        setTotal(0);

        toast.success('Processamento iniciado!', {
          description: 'Acompanhe o progresso abaixo.'
        });

        // Não finalize aqui. O resultado virá via polling.
        return;
      } else {
        // Fluxo antigo para 1 arquivo
        const endpoint = `${process.env.NEXT_PUBLIC_API_URL}/extract_data`;
        const response = await axios.post(endpoint, form, {
          headers: { Authorization: `Bearer ${token}` },
        });
        setResult(response.data);
        toast.success('Processamento concluído!', {
          description: 'Arquivo analisado com sucesso.'
        });
      }
    } catch (err: any) {
      const desc =
        err?.response?.data?.message ||
        err?.response?.data ||
        err?.message ||
        'Ocorreu um erro ao processar o arquivo. Tente novamente.';
      toast.error('Erro no processamento', { description: String(desc) });
    } finally {
      // Para ZIP, quem desliga o "Processando..." é o polling ao finalizar.
      const isZip = selectedFile && isZipFile(selectedFile);
      if (!isZip) setIsProcessing(false);
    }
  };


  const pollProgress = async (token: string) => {
    if (!taskId) return;

    try {
      const progUrl = `${process.env.NEXT_PUBLIC_API_URL}/extract-zip/progress/${taskId}`;
      const res = await fetch(progUrl, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (!res.ok) {
        // se a task sumiu, encerre polling
        if (pollRef.current) window.clearInterval(pollRef.current);
        setIsProcessing(false);
        toast.error('Progresso indisponível', { description: 'Tarefa não encontrada.' });
        return;
      }

      const d = await res.json();
      setStatus(d.status);
      const proc = Number(d.processed ?? 0);
      const tot = Number(d.total ?? 0);
      setProcessed(proc);
      setTotal(tot);
      const pct = tot > 0 ? Math.round((proc / tot) * 100) : 0;
      setPercent(pct);

      if (d.status === 'done') {
        // pega o resultado final
        const resultUrl = `${process.env.NEXT_PUBLIC_API_URL}/extract-zip/result/${taskId}`;
        const r = await fetch(resultUrl, {
          headers: { Authorization: `Bearer ${token}` }
        });
        const finalJson = await r.json();
        setResult(finalJson);
        setIsProcessing(false);
        setTaskId(null);
        if (pollRef.current) window.clearInterval(pollRef.current);
        toast.success('Processamento concluído!', { description: 'ZIP analisado com sucesso.' });
      } else if (d.status === 'error') {
        setIsProcessing(false);
        setTaskId(null);
        if (pollRef.current) window.clearInterval(pollRef.current);
        toast.error('Falha no processamento', { description: d.error || 'Erro desconhecido' });
      }
    } catch (e: any) {
      // erro de rede/etc – mantém polling por mais algumas tentativas
      console.error('poll error', e);
    }
  };


  const copyToClipboard = () => {
    if (result) {
      navigator.clipboard.writeText(JSON.stringify(result, null, 2))
      toast.success('JSON copiado!', { description: 'O resultado foi copiado para a área de transferência' })
    }
  }

  const downloadJson = () => {
    if (result) {
      const blob = new Blob([JSON.stringify(result, null, 2)], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `resultado-${Date.now()}.json`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
      toast.success('Download iniciado!', { description: 'O arquivo JSON está sendo baixado' })
    }
  }

  const removeFile = () => {
    setSelectedFile(null)
    setResult(null)
    toast.success('Arquivo removido')
  }

  const getFileIcon = (file: File) => {
    if (isZipFile(file)) return <FileText className="h-8 w-8 text-amber-500" />
    if (file.type === 'application/pdf') return <FileText className="h-8 w-8 text-red-500" />
    return <Image className="h-8 w-8 text-blue-500" />
  }

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  async function handleSaveEditingPrompt() {
    const promptKey = prompts.find(p => p.id_prompt === selectedPrompt)?.chave ?? '';
    const updatedData = { chave: promptKey, texto: currentPromptText }
    try {
      await updatePrompt(selectedPrompt, updatedData);
      toast.success('Sucesso!', { description: 'Prompt atualizado com sucesso.' });
    } catch (err) {
      console.error('Erro ao atualizar prompt:', err);
      toast.error('Erro', { description: 'Falha ao atualizar prompt.' });
    }
  }

  async function baixarCSV() {
    try {
      const csvString = await convertCSV(result);
      const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', 'dados_convertidos.csv');
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Falha ao converter CSV:', error);
    }
  }

  async function baixarINSERT() {
    try {
      const sqlContent = await convertINSERT(result);
      const blob = new Blob([sqlContent], { type: 'text/plain' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `comandos_sql_${new Date().getTime()}.txt`;
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Falha ao converter TXT:', error);
    }
  }

  if (loading) return <div>{null}</div>;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-4">
      <div className="max-w-6xl mx-auto space-y-6">
        <Navbar />
        <div className="text-center space-y-2">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
            Processador de Arquivos
          </h1>
          <p className="text-slate-600 text-lg">
            Faça upload de PDFs, imagens <span className="whitespace-nowrap">ou ZIP com múltiplos documentos</span> e processe com IA
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card className="shadow-lg border-0 bg-white/80 backdrop-blur">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Upload className="h-5 w-5" />
                Upload de Arquivo
              </CardTitle>
              <CardDescription>
                Selecione um PDF, imagem ou ZIP para processar
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div
                className={`border-2 border-dashed rounded-lg p-8 text-center transition-all duration-200 ${isDragOver ? 'border-blue-500 bg-blue-50' : 'border-slate-300 hover:border-slate-400'}`}
                onDrop={handleDrop}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
              >
                <Upload className="h-12 w-12 text-slate-400 mx-auto mb-4" />
                <p className="text-slate-600 mb-2">Arraste e solte um arquivo aqui</p>
                <p className="text-xs text-slate-500 mt-2">PDF, JPEG, PNG, TIFF, WebP (máx. 20MB) • ZIP (máx. 1000MB)</p>
              </div>

              {selectedFile && (
                <Card className="border border-green-200 bg-green-50">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        {getFileIcon(selectedFile)}
                        <div>
                          <p className="font-medium text-green-800">{selectedFile.name}</p>
                          <p className="text-sm text-green-600">{formatFileSize(selectedFile.size)}</p>
                        </div>
                      </div>
                      <Button variant="ghost" size="sm" onClick={removeFile} className="text-red-500 hover:text-red-700">
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )}
            </CardContent>
          </Card>

          <Card className="shadow-lg border-0 bg-white/80 backdrop-blur">
            <CardHeader>
              <CardTitle>Prompt</CardTitle>
              <CardDescription>Escolha o prompt referente ao tipo de arquivo que você está processando.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Select value={selectedPrompt?.toString()} onValueChange={(value) => setSelectedPrompt(Number(value))}>
                <SelectTrigger><SelectValue placeholder="Selecione um prompt" /></SelectTrigger>
                <SelectContent>
                  {prompts.map((prompt) => (
                    <SelectItem key={prompt.id_prompt} value={prompt.id_prompt.toString()}>
                      <div className="flex flex-col"><span className="font-medium">{prompt.chave}</span></div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {selectedPrompt && (
                <>
                  <Card className="border border-blue-200 bg-blue-50">
                    <CardContent className="p-3">
                      <div className="flex items-center gap-2">
                        <Badge variant="secondary">Selecionado</Badge>
                        <span className="text-sm font-medium">
                          {prompts.find((k) => k.id_prompt === selectedPrompt)?.chave}
                        </span>
                      </div>
                    </CardContent>
                  </Card>

                  <div className="space-y-3">
                    <Label htmlFor="prompt-editor" className="text-sm font-medium">Editar Prompt</Label>
                    <Textarea
                      id="prompt-editor"
                      placeholder="Digite ou edite o prompt aqui..."
                      value={currentPromptText}
                      onChange={(e) => setCurrentPromptText(e.target.value)}
                      className="min-h-[120px] max-h-[150px] resize-none"
                    />
                    <div className="flex justify-end">
                      <Button onClick={handleSaveEditingPrompt} disabled={!currentPromptText.trim()} className="flex items-center gap-2">
                        <Save className="h-4 w-4" />Salvar Prompt
                      </Button>
                    </div>
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          <Card className="shadow-lg border-0 bg-white/80 backdrop-blur">
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><Key className="h-5 w-5" />Chave da API</CardTitle>
              <CardDescription>Insira sua chave de API para processar o arquivo. Suas informações são seguras e não são armazenadas.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="relative">
                <Input
                  type={showApiKey ? 'text' : 'password'}
                  placeholder="sk-..."
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  className="pr-20"
                />
                <div className="absolute inset-y-0 right-0 flex items-center gap-1 pr-3">
                  <Button type="button" variant="ghost" size="sm" onClick={() => setShowApiKey(!showApiKey)} className="h-7 w-7 p-0">
                    {showApiKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                </div>
              </div>

              {apiKey && (
                <div className="flex items-center gap-2 text-sm">
                  <div className="flex items-center gap-1 text-green-600">
                    <Check className="h-4 w-4" /><span>Chave inserida</span>
                  </div>
                  <Badge variant="outline" className="text-xs">{apiKey.length} caracteres</Badge>
                </div>
              )}

              <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
                <div className="flex items-start gap-2">
                  <Shield className="h-4 w-4 text-amber-600 mt-0.5 flex-shrink-0" />
                  <div className="text-xs text-amber-800">
                    <p className="font-medium mb-1">Segurança garantida</p>
                    <p>Sua chave de API é processada localmente e não é armazenada em nossos servidores.</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <Separator />

        <Button
          onClick={handleProcess}
          disabled={!selectedFile || !selectedPrompt || !apiKey || isProcessing}
          className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
        >
          {isProcessing ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
              Processando...
            </>
          ) : (
            <>
              <Upload className="mr-2 h-4 w-4" />
              Processar Arquivo
            </>
          )}
        </Button>

        {(status === 'queued' || status === 'running') && (
          <div className="w-full">
            <div className="mt-4 bg-slate-200 rounded-full h-3 overflow-hidden">
              <div
                className="h-3 bg-gradient-to-r from-blue-600 to-purple-600 transition-all"
                style={{ width: `${percent}%` }}
              />
            </div>
            <div className="mt-2 flex items-center justify-between text-sm text-slate-700">
              <span>Status: {status}</span>
              <span>{processed}/{total} ({percent}%)</span>
            </div>
          </div>
        )}
        {status === 'error' && (
          <div className="mt-3 text-sm text-red-600">
            Ocorreu um erro durante o processamento do ZIP.
          </div>
        )}


        {result && (
          <Card className="shadow-lg border-0 bg-white/80 backdrop-blur">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Check className="h-5 w-5 text-green-500" />
                    Resultado do Processamento
                  </CardTitle>
                  <CardDescription>JSON com todas as informações extraídas</CardDescription>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={copyToClipboard} className="flex items-center gap-2">
                    <Copy className="h-4 w-4" />Copiar
                  </Button>
                  <Button variant="outline" size="sm" onClick={downloadJson} className="flex items-center gap-2">
                    <Download className="h-4 w-4" />Baixar
                  </Button>
                  <Button variant="outline" size="sm" onClick={baixarCSV} className="flex items-center gap-2">
                    <Download className="h-4 w-4" />Baixar CSV
                  </Button>
                  <Button variant="outline" size="sm" onClick={baixarINSERT} className="flex items-center gap-2">
                    <Download className="h-4 w-4" />Baixar INSERT
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="bg-slate-900 rounded-lg p-4 overflow-auto max-h-96">
                <pre className="text-green-400 text-sm font-mono">
                  {JSON.stringify(result, null, 2)}
                </pre>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
