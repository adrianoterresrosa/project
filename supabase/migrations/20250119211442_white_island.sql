/*
  # Criar bucket de avatares e políticas de acesso

  1. Novo Bucket
    - Cria o bucket 'avatars' para armazenar avatares dos usuários
  
  2. Políticas de Acesso
    - Permite que usuários autenticados leiam qualquer avatar
    - Permite que usuários autenticados atualizem apenas seus próprios avatares
*/

-- Criar bucket para avatares se não existir
INSERT INTO storage.buckets (id, name)
VALUES ('avatars', 'avatars')
ON CONFLICT (id) DO NOTHING;

-- Políticas para o bucket de avatares
CREATE POLICY "Usuários podem ver todos os avatares"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'avatars');

CREATE POLICY "Usuários podem fazer upload de seus próprios avatares"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'avatars' 
  AND (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "Usuários podem atualizar seus próprios avatares"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'avatars' 
  AND (storage.foldername(name))[1] = auth.uid()::text
)
WITH CHECK (
  bucket_id = 'avatars' 
  AND (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "Usuários podem deletar seus próprios avatares"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'avatars' 
  AND (storage.foldername(name))[1] = auth.uid()::text
);