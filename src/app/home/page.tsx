'use client'

import React, { useState, useCallback, useEffect } from 'react'
import { Upload, Download, Copy, FileText, Image, Check, X, Key, Eye, EyeOff, Shield } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { toast } from 'sonner'
import axios from 'axios'
import { Input } from '@/components/ui/input'
import { useRouter } from 'next/navigation';

interface Prompt {
  id_prompt: number;
  chave: string;
  texto: string;
}

const BASE_URL = "http://127.0.0.1:8000"

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

  useEffect(() => {
    const verifyToken = async () => {
      const token = localStorage.getItem('token');
      try {
        const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/verify-token/${token}`);

        if (!response.ok) {
          throw new Error('Token verification failed');
        }
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
      try {
        const response = await axios.get(`${BASE_URL}/prompts_read_list`, {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          }
        }
        );
        console.log("Prompts response:", response.data);
        setPrompts(response.data);
        if (response.data.length > 0) {
          setSelectedPrompt(response.data[0].id); // Seleciona o primeiro prompt por padrão
        }
      } catch (error) {
        toast.error('Erro ao carregar prompts', {
          description: 'Não foi possível carregar os prompts disponíveis.'
        });
      }
    };

    fetchPrompts();
  }, []);

  

  // Função para lidar com arquivos selecionados via input
  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      processSelectedFile(file)
    }
  }

  // Função para lidar com arquivos via drag and drop
  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(false)

    const files = Array.from(e.dataTransfer.files)
    if (files.length > 0) {
      processSelectedFile(files[0])
    }
  }, [])

  // Função centralizada para processar arquivo selecionado
  const processSelectedFile = (file: File) => {
    const validTypes = [
      'application/pdf',
      'image/jpeg',
      'image/jpg',
      'image/png',
      'image/gif',
      'image/webp',
      'image/tiff',
      'image/tif'
    ]

    if (!validTypes.includes(file.type)) {
      toast.error('Tipo de arquivo não suportado', {
        description: 'Por favor, selecione um PDF ou uma imagem (JPEG, PNG, GIF, WebP)'
      })
      return
    }

    if (file.size > 10 * 1024 * 1024) { // 10MB
      toast.error('Arquivo muito grande', {
        description: 'O arquivo deve ter no máximo 10MB'
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

  setIsProcessing(true);

  try {
    const promptText =
      prompts.find(p => p.id_prompt === selectedPrompt)?.texto ?? '';

    // Monta o multipart/form-data
    const form = new FormData();
    form.append('file', selectedFile);         // File ou Blob vindo do <input type="file">
    form.append('prompt', promptText);         // string
    form.append('api_key', apiKey);            // string

    const response = await axios.post(`${BASE_URL}/extract_data`, form, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (response.status === 200) {
      setResult(response.data);
      toast.success('Processamento concluído!', {
        description: 'O arquivo foi analisado com sucesso'
      });
    } else {
      toast.error('Erro no processamento', {
        description: `Resposta inesperada (${response.status}).`
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
    setIsProcessing(false);
  }
};

  const copyToClipboard = () => {
    if (result) {
      navigator.clipboard.writeText(JSON.stringify(result, null, 2))
      toast.success('JSON copiado!', {
        description: 'O resultado foi copiado para a área de transferência'
      })
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
      toast.success('Download iniciado!', {
        description: 'O arquivo JSON está sendo baixado'
      })
    }
  }

  const removeFile = () => {
    setSelectedFile(null)
    setResult(null)
    toast.success('Arquivo removido')
  }

  const getFileIcon = (file: File) => {
    if (file.type === 'application/pdf') {
      return <FileText className="h-8 w-8 text-red-500" />
    }
    return <Image className="h-8 w-8 text-blue-500" />
  }

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  if (loading) {
    return <div>{null}</div>;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-4">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="text-center space-y-2">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
            Processador de Arquivos
          </h1>
          <p className="text-slate-600 text-lg">
            Faça upload de PDFs ou imagens e processe com IA
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Upload Section */}
          <Card className="shadow-lg border-0 bg-white/80 backdrop-blur">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Upload className="h-5 w-5" />
                Upload de Arquivo
              </CardTitle>
              <CardDescription>
                Selecione um PDF ou imagem para processar
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Drop Zone */}
              <div
                className={`border-2 border-dashed rounded-lg p-8 text-center transition-all duration-200 ${isDragOver
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-slate-300 hover:border-slate-400'
                  }`}
                onDrop={handleDrop}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
              >
                <Upload className="h-12 w-12 text-slate-400 mx-auto mb-4" />
                <p className="text-slate-600 mb-2">
                  Arraste e solte um arquivo aqui ou
                </p>
                <label htmlFor="file-upload">
                  <Button variant="outline" className="cursor-pointer">
                    Selecionar arquivo
                  </Button>
                  <input
                    id="file-upload"
                    type="file"
                    accept=".pdf,image/*"
                    onChange={handleFileSelect}
                    className="hidden"
                  />
                </label>
                <p className="text-xs text-slate-500 mt-2">
                  PDF, JPEG, PNG, TIFF, WebP (máx. 10MB)
                </p>
              </div>

              {/* Selected File */}
              {selectedFile && (
                <Card className="border border-green-200 bg-green-50">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        {getFileIcon(selectedFile)}
                        <div>
                          <p className="font-medium text-green-800">
                            {selectedFile.name}
                          </p>
                          <p className="text-sm text-green-600">
                            {formatFileSize(selectedFile.size)}
                          </p>
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={removeFile}
                        className="text-red-500 hover:text-red-700"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )}
            </CardContent>
          </Card>

          {/* API Key Selection */}
          <Card className="shadow-lg border-0 bg-white/80 backdrop-blur">
            <CardHeader>
              <CardTitle>Prompt</CardTitle>
              <CardDescription>
                Escolha o prompt referente ao tipo de arquivo que você está processando.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Select
                value={selectedPrompt?.toString()}
                onValueChange={(value) => setSelectedPrompt(Number(value))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione um prompt" />
                </SelectTrigger>
                <SelectContent>
                  {prompts.map((prompt) => (
                    <SelectItem key={prompt.id_prompt} value={prompt.id_prompt.toString()}>
                      <div className="flex flex-col">
                        <span className="font-medium">{prompt.chave}</span>
                        {/* <span className="text-xs text-slate-500">
                          {prompt.texto}
                        </span> */}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {selectedPrompt && (
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
              )}
            </CardContent>
          </Card>

          {/* API Key Input */}
          <Card className="shadow-lg border-0 bg-white/80 backdrop-blur">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Key className="h-5 w-5" />
                Chave da API
              </CardTitle>
              <CardDescription>
                Insira sua chave de API para processar o arquivo. Suas informações são seguras e não são armazenadas.
              </CardDescription>
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
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowApiKey(!showApiKey)}
                    className="h-7 w-7 p-0"
                  >
                    {showApiKey ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </div>

              {apiKey && (
                <div className="flex items-center gap-2 text-sm">
                  <div className="flex items-center gap-1 text-green-600">
                    <Check className="h-4 w-4" />
                    <span>Chave inserida</span>
                  </div>
                  <Badge variant="outline" className="text-xs">
                    {apiKey.length} caracteres
                  </Badge>
                </div>
              )}

              <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
                <div className="flex items-start gap-2">
                  <Shield className="h-4 w-4 text-amber-600 mt-0.5 flex-shrink-0" />
                  <div className="text-xs text-amber-800">
                    <p className="font-medium mb-1">Segurança garantida</p>
                    <p>
                      Sua chave de API é processada localmente e não é armazenada
                      em nossos servidores.
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <Separator />

        <Button
          onClick={handleProcess}
          disabled={
            !selectedFile || !selectedPrompt || !apiKey || isProcessing
          }
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

        {/* Results Section */}
        {result && (
          <Card className="shadow-lg border-0 bg-white/80 backdrop-blur">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Check className="h-5 w-5 text-green-500" />
                    Resultado do Processamento
                  </CardTitle>
                  <CardDescription>
                    JSON com todas as informações extraídas
                  </CardDescription>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={copyToClipboard}
                    className="flex items-center gap-2"
                  >
                    <Copy className="h-4 w-4" />
                    Copiar
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={downloadJson}
                    className="flex items-center gap-2"
                  >
                    <Download className="h-4 w-4" />
                    Baixar
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