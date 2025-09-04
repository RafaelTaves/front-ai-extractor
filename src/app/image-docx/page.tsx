"use client";
import Navbar from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from '@/components/ui/badge'
import { Check, Copy, Download, Eye, EyeOff, FileText, Image, Key, Shield, Upload, X } from "lucide-react";
import Head from "next/head";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { toast } from 'sonner'
import { Separator } from "@/components/ui/separator";
import { imageToDocx } from "@/lib/api";

export default function ImageDocxPage() {
    const [isDragOver, setIsDragOver] = useState(false)
    const [selectedFile, setSelectedFile] = useState<File | null>(null)
    const [result, setResult] = useState<any>(null)
    const [isProcessing, setIsProcessing] = useState(false)
    const [apiKey, setApiKey] = useState<string>('')
    const [showApiKey, setShowApiKey] = useState(false)
    const [loading, setLoading] = useState(true)
    const router = useRouter();

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
        const apiKey = localStorage.getItem('api_key');
        if (apiKey) setApiKey(apiKey);
    }, [router]);

    const handleDrop = useCallback((e: React.DragEvent) => {
        e.preventDefault()
        setIsDragOver(false)
        const files = Array.from(e.dataTransfer.files)
        if (files.length > 0) processSelectedFile(files[0])
    }, [])
    const handleDragOver = useCallback((e: React.DragEvent) => {
        e.preventDefault()
        setIsDragOver(true)
    }, [])

    const handleDragLeave = useCallback((e: React.DragEvent) => {
        e.preventDefault()
        setIsDragOver(false)
    }, [])

    const processSelectedFile = (file: File) => {

        // Tipos aceitos para doc/imagem
        const validDocTypes = new Set([
            'image/jpeg',
            'image/jpg',
            'image/png',
            'image/gif',
            'image/webp',
            'image/tiff',
            'image/tif',
        ])

        // tamanho máximo (10MB docs/imagens; 1000MB ZIP)
        const maxSize = 30 * 1024 * 1024

        if (file.size > maxSize) {
            toast.error('Arquivo muito grande', {
                description: 'Documento deve ter no máximo 30MB'
            })
            return
        }

        setSelectedFile(file)
        setResult(null)
        toast.success('Arquivo carregado com sucesso!')
    }

    const getFileIcon = (file: File) => {
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

    const removeFile = () => {
        setSelectedFile(null)
        setResult(null)
        toast.success('Arquivo removido')
    }

    const handleProcess = async () => {
        if (!selectedFile) {
            alert('Selecione uma imagem primeiro.');
            return;
        }
        try {
            setIsProcessing(true);
            // chama sua função de API que retorna um Blob
            const blob = await imageToDocx(selectedFile, apiKey);

            // cria URL temporária e dispara download
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;

            // nome padrão; se quiser extrair do header, posso ajustar sua imageToDocx p/ retornar filename
            const base = selectedFile.name.replace(/\.[^.]+$/, '');
            a.download = `${base}_texto.docx`;

            document.body.appendChild(a);
            a.click();
            a.remove();
            URL.revokeObjectURL(url);
        } catch (err) {
            console.error(err);
            setIsProcessing(false);
            alert('Falha ao processar a imagem. Veja o console para detalhes.');
        } finally {
            setIsProcessing(false);
        }
    };

    if (loading) return <div>{null}</div>;
    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-4">
            <div className="max-w-6xl mx-auto space-y-6">
                <Navbar />
                <Head>
                    <title>Gerenciamento de Prompts</title>
                </Head>

                <div className="max-w-6xl mx-auto space-y-8">
                    <h1 className="text-4xl font-bold text-center bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                        Converter imagens para .docx
                    </h1>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2  gap-6">
                    <Card className="shadow-lg border-0 bg-white/80 backdrop-blur">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Upload className="h-5 w-5" />
                                Upload de Arquivo
                            </CardTitle>
                            <CardDescription>
                                Selecione uma imagem para converter em documento .docx
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
                                <p className="text-xs text-slate-500 mt-2">JPEG, PNG, TIFF, WebP (máx. 30MB)</p>
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
                            <Button
                                onClick={handleProcess}
                                disabled={!selectedFile || !apiKey || isProcessing}
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
                        </CardContent>
                    </Card>
                </div>

                <Separator />



                {/* {result && (
                    <Card className="shadow-lg border-0 bg-white/80 backdrop-blur">
                        <CardHeader>
                            <div className="flex items-center justify-between">
                                <div>
                                    <CardTitle className="flex items-center gap-2">
                                        <Check className="h-5 w-5 text-green-500" />
                                        Resultado do Processamento
                                    </CardTitle>
                                    <CardDescription>Arquivo docx para download</CardDescription>
                                </div>
                                <div className="flex gap-2">
                                    <Button variant="outline" size="sm" onClick={downloadJson} className="flex items-center gap-2">
                                        <Download className="h-4 w-4" />Baixar
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
                )} */}

            </div>
        </div>
    );
};

