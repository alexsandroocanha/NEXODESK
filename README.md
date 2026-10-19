<h1 align="center">Nexo Desk</h1>
<p align="center"><i>Sistema de Gestão de Chamados e Controle de Estoque</i></p>

---

## Resumo

O **Nexo Desk** é uma aplicação web desenvolvida para centralizar o gerenciamento de chamados de suporte técnico e o controle de estoque em um único ambiente.

A ideia surgiu durante minha experiência profissional na área de TI, ao identificar que os processos de registro de chamados e controle de materiais eram realizados de maneira descentralizada, utilizando anotações em grupos de WhatsApp, planilhas e registros manuais.

Esse cenário dificultava o acompanhamento das solicitações e das movimentações de estoque, tornando o processo dependente de atualizações manuais e conferências constantes para evitar informações perdidas ou divergências nos registros.

A partir dessa necessidade, desenvolvi a proposta do Nexo Desk: uma solução que busca reunir essas operações em um sistema centralizado, proporcionando maior organização, rastreabilidade e facilidade de gerenciamento.

---

## Requisitos

- Docker instalado
- Docker Compose disponível
- Git instalado
- Navegador web atualizado

---

## Tópicos

- [Visão Geral](#visão-geral)
- [Motivação do Projeto](#motivação-do-projeto)
- [Funcionalidades](#funcionalidades)
- [Tecnologias Utilizadas](#tecnologias-utilizadas)
- [Estrutura do Repositório](#estrutura-do-repositório)
- [Como Executar a Aplicação](#como-executar-a-aplicação)
- [Acessando a Aplicação](#acessando-a-aplicação)
- [Testes e Verificações](#testes-e-verificações)
- [Considerações Finais](#considerações-finais)
- [Contato](#contato)

---

## Links Rápidos

- Repositório: [Nexo Desk](COLOQUE_AQUI_A_URL_DO_REPOSITORIO)
- Documentação do Django: https://docs.djangoproject.com/
- Documentação do Django REST Framework: https://www.django-rest-framework.org/
- Documentação do React: https://react.dev/
- Documentação do Docker: https://docs.docker.com/

---

## Visão Geral

O Nexo Desk foi idealizado para atender às necessidades de organização de equipes de suporte técnico, reunindo informações operacionais em uma aplicação web.

A proposta é substituir processos fragmentados por uma estrutura centralizada, facilitando o registro e o acompanhamento de chamados e o controle das movimentações de estoque.

O projeto utiliza uma arquitetura separada entre frontend, backend e banco de dados, permitindo que cada componente tenha responsabilidades definidas.

---

## Motivação do Projeto

A motivação para desenvolver o Nexo Desk veio de uma situação observada no meu próprio ambiente de trabalho.

Na rotina de suporte técnico, percebi que não havia uma ferramenta centralizada para administrar os chamados e acompanhar o estoque. As informações eram distribuídas entre grupos de WhatsApp, planilhas e anotações manuais.

Na prática, o acompanhamento dependia de manter diferentes registros atualizados e conferir manualmente as movimentações para evitar que chamados fossem esquecidos ou que houvesse divergências no estoque.

Essa experiência me levou a pensar em como uma aplicação poderia simplificar esses processos.

O Nexo Desk surgiu, portanto, da identificação de um problema real e da iniciativa de desenvolver uma solução utilizando tecnologias de desenvolvimento web.

O objetivo não é apenas digitalizar registros, mas estabelecer uma base para um processo de atendimento mais organizado, com informações centralizadas e maior rastreabilidade operacional.

---

## Funcionalidades

### Gestão de Chamados

Módulo destinado à organização das solicitações de suporte técnico, com o objetivo de centralizar os registros e facilitar o acompanhamento dos atendimentos.

### Controle de Estoque

Módulo voltado ao gerenciamento dos itens e ao registro de movimentações, permitindo estruturar o histórico de entradas e saídas de materiais.

### API REST

O backend utiliza o Django REST Framework para disponibilizar uma API responsável pela comunicação entre a interface frontend e a aplicação.

### Persistência de Dados

O PostgreSQL é utilizado como banco de dados relacional para armazenar as informações da aplicação.

### Ambiente Containerizado

O Docker e o Docker Compose são utilizados para organizar os serviços e simplificar a configuração do ambiente de desenvolvimento.

---

## Tecnologias Utilizadas

![Python](https://img.shields.io/badge/Python-3776AB?style=for-the-badge&logo=python&logoColor=white)
![Django](https://img.shields.io/badge/Django-092E20?style=for-the-badge&logo=django&logoColor=white)
![Django REST Framework](https://img.shields.io/badge/Django_REST_Framework-A30000?style=for-the-badge&logo=django&logoColor=white)

![React](https://img.shields.io/badge/React-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)
![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?style=for-the-badge&logo=typescript&logoColor=white)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-316192?style=for-the-badge&logo=postgresql&logoColor=white)

![Docker](https://img.shields.io/badge/Docker-2496ED?style=for-the-badge&logo=docker&logoColor=white)
![Docker Compose](https://img.shields.io/badge/Docker_Compose-2496ED?style=for-the-badge&logo=docker&logoColor=white)

### Backend

- **Python:** linguagem utilizada na implementação da lógica do servidor.
- **Django:** framework responsável pela estrutura do backend.
- **Django REST Framework:** desenvolvimento da API REST.

### Frontend

- **React:** construção da interface web.
- **TypeScript:** tipagem estática e organização do código frontend.

### Banco de Dados

- **PostgreSQL:** armazenamento relacional das informações.

### Infraestrutura

- **Docker:** containerização dos componentes.
- **Docker Compose:** gerenciamento dos serviços da aplicação.

---

## Estrutura do Repositório

O projeto é organizado em serviços que trabalham em conjunto para compor a aplicação.

A estrutura geral contempla:

- **Frontend:** interface e componentes da aplicação web.
- **Backend:** lógica de negócio, modelos e endpoints da API.
- **Banco de dados:** persistência das informações.
- **Docker Compose:** configuração dos serviços e de sua execução conjunta.

A estrutura exata de diretórios pode ser consultada diretamente no repositório.

---
<br>
<br>

<h1 align="center">Como Executar a Aplicação</h1>

### 1. Clonar o repositório

```bash
git clone COLOQUE_AQUI_A_URL_DO_REPOSITORIO
```

Entre na pasta do projeto:

```bash
cd NOME_DA_PASTA
```

### 2. Configurar as variáveis de ambiente

Verifique as instruções do projeto e configure o arquivo `.env` com as variáveis necessárias para a execução dos serviços.

**Importante:** não compartilhe credenciais, senhas ou chaves privadas no repositório.

### 3. Iniciar os serviços

Com o Docker em execução, utilize:

```bash
docker compose up --build -d
```

Esse comando constrói as imagens necessárias e inicia os serviços definidos no arquivo `compose.yaml` ou `docker-compose.yml`.

### 4. Verificar os serviços

Para conferir o estado dos containers:

```bash
docker compose ps
```

Para consultar os logs:

```bash
docker compose logs -f
```

---

## Acessando a Aplicação

Quando os serviços estiverem em execução, os endereços locais dependerão das portas configuradas no Docker Compose.

No ambiente de desenvolvimento utilizado:

- **Frontend:** http://localhost:5173/
- **Backend:** http://localhost:8000/

Esses endereços pressupõem que as portas estejam configuradas e disponíveis no ambiente local.

---

## Testes e Verificações

Após iniciar os serviços, verifique se os containers estão em execução:

```bash
docker compose ps
```

Consulte os logs do backend:

```bash
docker compose logs -f backend
```

Consulte os logs do frontend:

```bash
docker compose logs -f frontend
```

Verifique também se a aplicação web pode ser acessada pelo navegador e se o backend responde conforme a configuração da API.

---

## Considerações Finais

O Nexo Desk representa a aplicação prática de conhecimentos de desenvolvimento full stack para resolver um problema identificado durante minha experiência profissional em TI.

O projeto reúne conceitos de desenvolvimento backend, construção de interfaces web, APIs REST, persistência de dados e containerização, tendo como foco a organização dos processos de suporte técnico e controle de estoque.

Mais do que um exercício técnico, o Nexo Desk é um projeto orientado por uma necessidade real: reduzir a fragmentação das informações e criar uma base para um gerenciamento operacional mais centralizado.

O desenvolvimento também representa uma oportunidade de aprofundar conhecimentos em arquitetura de aplicações, integração entre componentes e construção de soluções que possam evoluir conforme as necessidades dos usuários.

---

## Contato

[![LinkedIn](https://img.shields.io/badge/LinkedIn-0077B5?style=for-the-badge&logo=linkedin&logoColor=white)](https://www.linkedin.com/in/alexsandro-ocanha-rodrigues-77149a35b/)

[![Instagram](https://img.shields.io/badge/Instagram-E4405F?style=for-the-badge&logo=instagram&logoColor=white)](https://www.instagram.com/alexsandro.pcap/)

[![Gmail](https://img.shields.io/badge/Gmail-D14836?style=for-the-badge&logo=gmail&logoColor=white)](mailto:alexsandroocanha@gmail.com)
