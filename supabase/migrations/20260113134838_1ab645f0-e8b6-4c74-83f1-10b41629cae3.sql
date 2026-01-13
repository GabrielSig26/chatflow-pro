-- =============================================
-- REFINAMENTO DE POLÍTICAS RLS
-- =============================================

-- 1. TABELA PROFILES: Usuários leem seu próprio perfil, admin lê todos
DROP POLICY IF EXISTS "Profiles are viewable by authenticated users" ON public.profiles;

CREATE POLICY "Users can view own profile"
ON public.profiles FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all profiles"
ON public.profiles FOR SELECT
USING (public.has_role(auth.uid(), 'admin'));

-- 2. TABELA TAGS: admin e marketing têm CRUD, demais apenas leitura
DROP POLICY IF EXISTS "Admins can manage tags" ON public.tags;
DROP POLICY IF EXISTS "Tags are viewable by authenticated users" ON public.tags;

CREATE POLICY "Tags are viewable by authenticated users"
ON public.tags FOR SELECT
USING (true);

CREATE POLICY "Admins can manage tags"
ON public.tags FOR ALL
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Marketing can manage tags"
ON public.tags FOR ALL
USING (public.has_role(auth.uid(), 'marketing'));

-- 3. TABELA CHATS: Todos autenticados podem ler/criar, apenas admin pode deletar
DROP POLICY IF EXISTS "Chats are viewable by authenticated users" ON public.chats;
DROP POLICY IF EXISTS "Authenticated users can create chats" ON public.chats;
DROP POLICY IF EXISTS "Authenticated users can update chats" ON public.chats;

CREATE POLICY "Authenticated users can view chats"
ON public.chats FOR SELECT
USING (true);

CREATE POLICY "Authenticated users can create chats"
ON public.chats FOR INSERT
WITH CHECK (true);

CREATE POLICY "Authenticated users can update chats"
ON public.chats FOR UPDATE
USING (true);

CREATE POLICY "Admins can delete chats"
ON public.chats FOR DELETE
USING (public.has_role(auth.uid(), 'admin'));

-- 4. TABELA MESSAGES: Todos autenticados podem ler/criar, apenas admin pode deletar
DROP POLICY IF EXISTS "Messages are viewable by authenticated users" ON public.messages;
DROP POLICY IF EXISTS "Authenticated users can create messages" ON public.messages;

CREATE POLICY "Authenticated users can view messages"
ON public.messages FOR SELECT
USING (true);

CREATE POLICY "Authenticated users can create messages"
ON public.messages FOR INSERT
WITH CHECK (true);

CREATE POLICY "Admins can delete messages"
ON public.messages FOR DELETE
USING (public.has_role(auth.uid(), 'admin'));

-- 5. INSERIR TAGS INICIAIS (ignorar se já existirem)
INSERT INTO public.tags (nome, cor) VALUES
  ('Cliente', '#10B981'),
  ('Lead', '#F59E0B'),
  ('Suporte', '#3B82F6'),
  ('Suporte Prioritário', '#EF4444')
ON CONFLICT DO NOTHING;