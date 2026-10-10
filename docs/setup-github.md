# Configuração do GitHub (T-005) — passo a passo

## 1. Criar e subir o repositório
```bash
git init -b main
git add .
git commit -m "chore: esqueleto inicial do monorepo"
gh repo create mundo-aprendizado --private --source=. --push   # ou crie pelo site
```
> Antes: troque `SEU-USUARIO` em `.github/CODEOWNERS` e `SEU NOME` em `LICENSE`.

## 2. Proteger a `main`
Settings → Rules → Rulesets → New branch ruleset (alvo: `main`):
- Require a pull request before merging (1 aprovação, ou 0 se estiver trabalhando sozinho)
- Require status checks to pass: **`ci`**, **`commits (Conventional Commits)`**, `docker-build (api)`, `docker-build (web)`
- Block force pushes
- Require linear history (opcional, recomendado)

> Os checks só aparecem na lista depois de rodarem uma vez: abra um PR de teste primeiro.

## 3. Segurança
Settings → Code security: habilite **Dependabot alerts**, **Dependabot security updates**, **Secret scanning** e **Push protection**.
CodeQL em repositório privado exige GitHub Advanced Security; em repositório público é gratuito.
Gitleaks em repositório de **organização** exige o secret `GITLEAKS_LICENSE`.

## 4. Pacotes (GHCR)
O workflow `docker-publish.yml` usa o `GITHUB_TOKEN`, sem configurar nada. Depois do primeiro push:
Packages → (imagem) → Package settings → ligue o pacote ao repositório e, se quiser, torne-o público.

## 5. Fixar actions por SHA (recomendado)
Actions de terceiros podem ser comprometidas e ter tags reescritas. As actions estão em tags (`@v4`, etc.) para facilitar a leitura. Antes de ir para produção, fixe por SHA do commit, por exemplo com a ferramenta `pinact`:
```bash
brew install pinact   # ou baixe o binário do release
pinact run
```
O Dependabot (`github-actions`) continua propondo atualizações mesmo com SHA fixo.
Atenção especial a `aquasecurity/trivy-action` e `gitleaks/gitleaks-action` (ferramentas de segurança são alvos atrativos).

## 6. Primeiro teste do pipeline
1. `git switch -c chore/teste-ci`, faça uma mudança pequena e abra o PR.
2. Veja `ci`, `commits` e `docker-build` ficarem verdes.
3. Faça o merge: o `docker-publish` publica as imagens no GHCR.
