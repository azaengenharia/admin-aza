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

## Vídeos no Supabase

Não é necessária uma tabela ou migração adicional: fotos e vídeos usam as galerias e políticas já existentes, e o tipo é identificado pelo arquivo. O limite de tamanho configurado em **Storage Settings** e no bucket `aza-media` precisa comportar os vídeos enviados.
