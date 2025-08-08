'use client'

import React, { useState, useCallback } from 'react'
import { Upload, Download, Copy, FileText, Image, Check, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { toast } from 'sonner'

// Simulação das chaves de API (substitua pelos seus dados reais)
const API_KEYS = [
  { id: 'openai', label: 'OpenAI GPT-4', description: 'Análise avançada de documentos' },
  { id: 'claude', label: 'Claude 3', description: 'Processamento de texto e imagens' },
  { id: 'gemini', label: 'Google Gemini', description: 'Análise multimodal' },
  { id: 'azure', label: 'Azure AI', description: 'Serviços cognitivos Microsoft' },
]

export default function FileProcessorPage() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [selectedKey, setSelectedKey] = useState<string>('')
  const [isProcessing, setIsProcessing] = useState(false)
  const [result, setResult] = useState<any>(null)
  const [isDragOver, setIsDragOver] = useState(false)

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
      'image/webp'
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
    if (!selectedFile || !selectedKey) {
      toast.error('Dados incompletos', {
        description: 'Selecione um arquivo e uma chave de API'
      })
      return
    }

    setIsProcessing(true)

    try {
      // Simular processamento (substitua pela sua lógica de API)
      await new Promise(resolve => setTimeout(resolve, 2000))
      
      // Resultado simulado (substitua pelo resultado real da sua API)
      const mockResult = {
        file: {
          name: selectedFile.name,
          size: selectedFile.size,
          type: selectedFile.type,
          lastModified: selectedFile.lastModified
        },
        apiKey: selectedKey,
        processedAt: new Date().toISOString(),
        analysis: {
          content: "Conteúdo extraído do arquivo...",
          entities: ["Entidade 1", "Entidade 2", "Entidade 3"],
          summary: "Resumo do documento processado...",
          confidence: 0.95
        },
        metadata: {
          pages: 5,
          language: "pt-BR",
          processingTime: "2.3s"
        }
      }

      setResult(mockResult)
      toast.success('Processamento concluído!', {
        description: 'O arquivo foi analisado com sucesso'
      })
    } catch (error) {
      toast.error('Erro no processamento', {
        description: 'Ocorreu um erro ao processar o arquivo. Tente novamente.'
      })
    } finally {
      setIsProcessing(false)
    }
  }

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
                className={`border-2 border-dashed rounded-lg p-8 text-center transition-all duration-200 ${
                  isDragOver
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
                  PDF, JPEG, PNG, GIF, WebP (máx. 10MB)
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
              <Select value={selectedKey} onValueChange={setSelectedKey}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione um prompt" />
                </SelectTrigger>
                <SelectContent>
                  {API_KEYS.map((key) => (
                    <SelectItem key={key.id} value={key.id}>
                      <div className="flex flex-col">
                        <span className="font-medium">{key.label}</span>
                        <span className="text-xs text-slate-500">
                          {key.description}
                        </span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {selectedKey && (
                <Card className="border border-blue-200 bg-blue-50">
                  <CardContent className="p-3">
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary">Selecionado</Badge>
                      <span className="text-sm font-medium">
                        {API_KEYS.find(k => k.id === selectedKey)?.label}
                      </span>
                    </div>
                  </CardContent>
                </Card>
              )}

              <Separator />

              <Button
                onClick={handleProcess}
                disabled={!selectedFile || !selectedKey || isProcessing}
                className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
                size="lg"
              >
                {isProcessing ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                    Processando...
                  </>
                ) : (
                  'Processar Arquivo'
                )}
              </Button>
            </CardContent>
          </Card>
        </div>

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
  )
}