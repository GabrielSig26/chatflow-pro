import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Save, TestTube, CheckCircle, XCircle, Webhook } from 'lucide-react';

interface AppSettings {
  id: string;
  n8n_webhook_url: string | null;
  meta_access_token: string | null;
  whatsapp_phone_id: string | null;
}

export function ApiSettingsPanel() {
  const { role } = useAuth();
  const { toast } = useToast();
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<'success' | 'error' | null>(null);

  const [webhookUrl, setWebhookUrl] = useState('');
  const [accessToken, setAccessToken] = useState('');
  const [phoneId, setPhoneId] = useState('');

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('app_settings')
        .select('*')
        .limit(1)
        .maybeSingle();

      if (error) throw error;

      if (data) {
        setSettings(data);
        setWebhookUrl(data.n8n_webhook_url || '');
        setAccessToken(data.meta_access_token || '');
        setPhoneId(data.whatsapp_phone_id || '');
      }
    } catch (error: any) {
      toast({
        title: 'Erro ao carregar configurações',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!settings?.id) return;

    setSaving(true);
    try {
      const { error } = await supabase
        .from('app_settings')
        .update({
          n8n_webhook_url: webhookUrl || null,
          meta_access_token: accessToken || null,
          whatsapp_phone_id: phoneId || null,
        })
        .eq('id', settings.id);

      if (error) throw error;

      toast({
        title: 'Configurações salvas!',
        description: 'As configurações de integração foram atualizadas.',
      });
    } catch (error: any) {
      toast({
        title: 'Erro ao salvar',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  const handleTestWebhook = async () => {
    if (!webhookUrl) {
      toast({
        title: 'URL não configurada',
        description: 'Informe a URL do webhook antes de testar.',
        variant: 'destructive',
      });
      return;
    }

    setTesting(true);
    setTestResult(null);

    try {
      const response = await fetch(webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          test: true,
          timestamp: new Date().toISOString(),
          message: 'Teste de conexão do FluentSync',
        }),
      });

      if (response.ok) {
        setTestResult('success');
        toast({
          title: 'Webhook funcionando!',
          description: 'O webhook do n8n respondeu com sucesso.',
        });
      } else {
        setTestResult('error');
        toast({
          title: 'Erro no webhook',
          description: `Resposta: ${response.status} ${response.statusText}`,
          variant: 'destructive',
        });
      }
    } catch (error: any) {
      setTestResult('error');
      toast({
        title: 'Falha na conexão',
        description: error.message || 'Não foi possível conectar ao webhook.',
        variant: 'destructive',
      });
    } finally {
      setTesting(false);
    }
  };

  if (role !== 'admin') {
    return null;
  }

  if (loading) {
    return (
      <Card>
        <CardContent className="pt-6 flex items-center justify-center">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Webhook className="w-5 h-5" />
          Integração WhatsApp / n8n
        </CardTitle>
        <CardDescription>
          Configure a integração com n8n e Meta API para envio de mensagens via WhatsApp
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* n8n Webhook URL */}
        <div className="space-y-2">
          <Label htmlFor="webhook-url">URL do Webhook n8n</Label>
          <div className="flex gap-2">
            <Input
              id="webhook-url"
              type="url"
              placeholder="https://seu-n8n.com/webhook/..."
              value={webhookUrl}
              onChange={(e) => setWebhookUrl(e.target.value)}
              className="flex-1"
            />
            <Button
              variant="outline"
              onClick={handleTestWebhook}
              disabled={testing || !webhookUrl}
            >
              {testing ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : testResult === 'success' ? (
                <CheckCircle className="w-4 h-4 text-emerald-500" />
              ) : testResult === 'error' ? (
                <XCircle className="w-4 h-4 text-destructive" />
              ) : (
                <TestTube className="w-4 h-4" />
              )}
              <span className="ml-2">Testar</span>
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            URL do webhook no n8n que receberá as mensagens enviadas
          </p>
        </div>

        {/* Meta Access Token */}
        <div className="space-y-2">
          <Label htmlFor="meta-token">Meta Access Token</Label>
          <Input
            id="meta-token"
            type="password"
            placeholder="EAAx..."
            value={accessToken}
            onChange={(e) => setAccessToken(e.target.value)}
          />
          <p className="text-xs text-muted-foreground">
            Token de acesso da API do Meta/WhatsApp Business
          </p>
        </div>

        {/* WhatsApp Phone ID */}
        <div className="space-y-2">
          <Label htmlFor="phone-id">WhatsApp Phone ID</Label>
          <Input
            id="phone-id"
            type="text"
            placeholder="123456789012345"
            value={phoneId}
            onChange={(e) => setPhoneId(e.target.value)}
          />
          <p className="text-xs text-muted-foreground">
            ID do número de telefone do WhatsApp Business
          </p>
        </div>

        {/* Save Button */}
        <Button onClick={handleSave} disabled={saving} className="w-full">
          {saving ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Salvando...
            </>
          ) : (
            <>
              <Save className="w-4 h-4 mr-2" />
              Salvar Configurações
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  );
}
