# Admin AZA

Painel administrativo separado para gerenciar os conteúdos que aparecem nos sites AZA Engenharia e AZA Imóveis.

## Escopo inicial

- Login visual pronto para conectar ao Supabase Auth.
- Módulo de imóveis.
- Módulo de obras.
- Upload de fotos e vídeos com progresso e retomada para arquivos grandes.
- Campos de destaque, status e publicação.
- Preview do card antes de salvar.

## Futuro Supabase

Tabelas sugeridas:

- `properties`
- `works`
- `properties_images`
- `works_images`

Recursos:

- Supabase Auth para controle de acesso.
- Supabase Database para conteúdo.
- Supabase Storage para fotos e vídeos.
- Sites públicos consumindo apenas registros publicados.

## Ativação dos vídeos

Execute uma vez o arquivo `supabase/video-media.sql` no SQL Editor do projeto Supabase antes de publicar os três sites. Ele adiciona o tipo de mídia às galerias atuais sem alterar as imagens já cadastradas.

O limite de tamanho configurado em **Storage Settings** e no bucket `aza-media` também precisa comportar os vídeos enviados.
