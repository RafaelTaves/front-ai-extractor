"use client"
import { useState } from "react"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Eye, EyeOff } from "lucide-react" 
import { toast } from "sonner"
import axios from "axios"

export default function Login() {
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false);
  const [user, setUser] = useState("");
  const [password, setPassword] = useState("");

  const handleLogin = async (event: any) => {
    event.preventDefault();
    setLoading(true);

    const formDetails = new URLSearchParams();
        formDetails.append('grant_type', 'password');
        formDetails.append('username', user);
        formDetails.append('password', password);
        formDetails.append('scope', '');
        formDetails.append('client_id', '');
        formDetails.append('client_secret', '');

    try {
      const response = await axios.post(`${process.env.NEXT_PUBLIC_API_URL}/login`, formDetails, {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
      });

      console.log("Login response:", response.data);
      if (response.status !== 200) {
        console.log("Credenciais inválidas!");
        throw new Error("Credenciais inválidas!");
      }

      localStorage.setItem("token", response.data.access_token);
      localStorage.setItem("api_key", response.data.api_key);

      toast.success("Login realizado!", {
        description: "Redirecionando para seleção de local...",
        duration: 2000,
      });

      setTimeout(() => {
        window.location.href = "/home";
      }, 1000);
    } catch {
      toast.error("Erro no login", {
        description: "Usuario ou senha incorretos!",
        duration: 3000,
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-primaria/10 min-h-screen flex overflow-hidden">
      <Card className="w-full h-full rounded-t-none rounded-xl shadow-lg max-w-xl mx-auto my-10">
        <CardHeader>
          <CardTitle className="text-primaria">Acesse sua conta</CardTitle>
          <CardDescription className="text-secundaria">
            Informe seus dados abaixo para acessar sua conta.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form>
            <div className="flex flex-col gap-6">
              <div className="grid gap-2">
                <Label htmlFor="user" className="text-primaria">user</Label>
                <Input
                  id="user"
                  type="user"
                  value={user}
                  onChange={(e) => setUser(e.target.value)}
                  required
                />
              </div>
              <div className="grid gap-2 relative">
                <div className="flex items-center justify-between">
                  <Label htmlFor="password" className="text-primaria">Password</Label>
                </div>
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(prev => !prev)}
                  className="absolute right-3 top-[32px] text-muted-foreground"
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>
          </form>
        </CardContent>
        <CardFooter className="flex-col gap-2">
          <Button type="submit" onClick={handleLogin} disabled={loading} className="w-full bg-primaria hover:bg-primaria/80">
            Login
          </Button>
        </CardFooter>
      </Card>
    </div>
  )
}
