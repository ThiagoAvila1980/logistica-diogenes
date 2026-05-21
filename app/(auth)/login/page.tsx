import {

  Card,

  CardContent,

  CardDescription,

  CardHeader,

  CardTitle,

} from "@/components/ui/card";

import { LoginForm } from "@/components/auth/login-form";

import { useMockData } from "@/lib/data/config";



type Props = {

  searchParams: Promise<{ next?: string }>;

};



export default async function LoginPage({ searchParams }: Props) {

  const { next } = await searchParams;



  return (

    <Card>

      <CardHeader>

        <CardTitle>Fluxo Diógenes</CardTitle>

        <CardDescription>

          Entre com e-mail e senha. A biometria será cadastrada na primeira

          confirmação de etapa.

        </CardDescription>

      </CardHeader>

      <CardContent>

        <LoginForm nextPath={next} showDemoHint={useMockData()} />

      </CardContent>

    </Card>

  );

}

