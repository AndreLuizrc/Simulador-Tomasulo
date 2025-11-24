# Simulador Tomasulo

Este projeto é um simulador interativo do algoritmo de Tomasulo, projetado para demonstrar o funcionamento da execução de instruções out-of-order em uma arquitetura de pipeline. Ele visualiza as etapas do algoritmo, incluindo o uso de Estações de Reserva (Reservation Stations), Buffer de Reordenação (Reorder Buffer - ROB), e o Barramento Comum de Dados (Common Data Bus - CDB). O simulador também incorpora o uso de Tabela de Renomeação de Registradores (Register Alias Table - RAT) e predição de desvios para otimizações de pipeline.

## Tecnologias Utilizadas

Este projeto é construído com:

-   **Vite**: Um bundler de próxima geração para desenvolvimento web.
-   **TypeScript**: Um superconjunto tipado do JavaScript que compila para JavaScript puro.
-   **React**: Uma biblioteca JavaScript para construir interfaces de usuário.
-   **shadcn-ui**: Uma coleção de componentes UI reutilizáveis.
-   **Tailwind CSS**: Um framework CSS utility-first para construção rápida de UIs.

## Como Compilar e Executar o Projeto

Para configurar e rodar este projeto em sua máquina local, siga os passos abaixo:

1.  **Clone o repositório:**
    ```sh
    git clone https://github.com/AndreLuizrc/Simulador-Tomasulo.git
    ```
2.  **Navegue até o diretório do projeto:**
    ```sh
    cd Simulador-Tomasulo
    ```
3.  **Instale as dependências:**
    ```sh
    npm install
    ```
4.  **Inicie o servidor de desenvolvimento:**
    ```sh
    npm run dev
    ```

Após executar `npm run dev`, o simulador estará disponível no seu navegador em `http://localhost:5173` (ou outra porta disponível).

## Como Funciona o Algoritmo de Tomasulo no Simulador

O algoritmo de Tomasulo permite a execução de instruções out-of-order, minimizando os stalls causados por dependências de dados. No simulador, cada ciclo de clock processa as seguintes etapas na ordem apresentada (que é a ordem em que as atualizações de estado se propagam):

### 1. Commit (Retirada de Instruções)

Nesta fase, as instruções que já concluíram sua execução e escrita de resultados são retiradas do Buffer de Reordenação (ROB) em ordem. Se uma instrução no cabeçalho do ROB estiver pronta e não for uma instrução de desvio mal predita, seus resultados são confirmados no Register File (Arquivo de Registradores) ou na memória, e a entrada do ROB é liberada. No caso de uma predição de desvio incorreta, o pipeline é descarregado (flush), e o estado do simulador é restaurado para um ponto de controle anterior.

### 2. WriteBack (Escrita de Resultados)

Instruções que concluíram sua fase de execução nas Unidades Funcionais (Functional Units - FUs) transmitem seus resultados através do Common Data Bus (CDB). As Estações de Reserva (Reservation Stations - RS) e o Buffer de Reordenação (ROB) "escutam" o CDB para atualizar seus operandos com os valores que estão sendo transmitidos, resolvendo dependências de dados.

### 3. Execute (Execução de Instruções)

As instruções nas Estações de Reserva que possuem todos os seus operandos disponíveis (seja do Register File ou do CDB) iniciam ou continuam sua execução nas Unidades Funcionais correspondentes. Cada unidade funcional possui uma latência específica (e.g., ADD: 2 ciclos, MUL: 4 ciclos), e as instruções permanecem nesta fase até que seu tempo de execução seja completado.

### 4. Issue (Despacho de Instruções)

Nesta fase, uma nova instrução é lida da memória de instruções. Se houver uma Estação de Reserva disponível para o tipo de operação da instrução e uma entrada livre no Buffer de Reordenação (ROB), a instrução é despachada. Os operandos são buscados no Register File ou na Register Alias Table (RAT) se eles estiverem pendentes de cálculo em outra instrução (indicando uma dependência de nome). A instrução é então colocada na Estação de Reserva e uma entrada é alocada no ROB.

Essas quatro fases são repetidas a cada ciclo de clock, permitindo a execução paralela e out-of-order de instruções e a visualização do estado do pipeline em tempo real.
