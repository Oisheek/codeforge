# CodeForge AI

> Terminal-native AI software engineering agent

CodeForge AI is an AI-powered software engineering agent that runs directly in your terminal and works against the repository you are currently working in.

It combines repository indexing, retrieval-augmented context, model selection, reasoning, tool execution, verification, and fallback routing into a single terminal-native development workflow.

---

## Features

- Terminal-native AI software engineering agent
- Repository-aware code understanding
- Repository indexing and retrieval
- Retrieval-Augmented Generation (RAG)
- Automatic model-role selection
- OpenRouter integration
- Model fallback handling
- Multi-step tool execution
- File reading and searching
- File editing and writing
- Shell command execution
- Command approval workflow
- Git repository awareness
- Engineering verification workflow
- Live terminal activity dashboard
- Context usage reporting
- Model usage reporting
- Reasoning configuration
- Tree-sitter-powered source-code parsing
- Multi-language source-code support

---

## Requirements

### Node.js

CodeForge requires:

```text
Node.js >= 22.13.0
```

Check your Node.js version:

```bash
node --version
```

### OpenRouter API Key

CodeForge currently uses OpenRouter for AI model access.

You need an OpenRouter API key.

**Windows CMD**
```cmd
set OPENROUTER_API_KEY=your_api_key_here
```

**Windows PowerShell**
```powershell
$env:OPENROUTER_API_KEY="your_api_key_here"
```

**macOS / Linux**
```bash
export OPENROUTER_API_KEY="your_api_key_here"
```

You can also configure the key through an environment file when running CodeForge locally.

---

## Installation

### Install with npm

Install CodeForge globally:

```bash
npm install -g @oisheek_c/codeforge
```

Verify the installation:

```bash
codeforge --version
```

Expected output:

```text
CodeForge AI v1.0.2
```

Once installed, the `codeforge` command is available globally.

### Run with npx

CodeForge can also be run without a global installation:

```bash
npx @oisheek_c/codeforge
```

Check the version:

```bash
npx @oisheek_c/codeforge --version
```

---

## Getting Started

Navigate to the project you want CodeForge to work with:

```bash
cd path/to/your/project
```

Then start CodeForge:

```bash
codeforge
```

CodeForge initializes against the current directory and builds a repository index.

You will then see an interactive terminal prompt:

```text
>
```

Enter your request using natural language.

For example:

```text
> explain this repository
> explain how authentication works
> find the implementation of the routing system
> find the bug in the login flow and fix it
```

---

## Basic Commands

### Start CodeForge
```bash
codeforge
```

### Show help
```bash
codeforge --help
```
or:
```bash
codeforge -h
```

### Show version
```bash
codeforge --version
```
or:
```bash
codeforge -v
```

---

## How CodeForge Works

A typical CodeForge request follows this pipeline:

```text
User Request
     |
     v
Intent Detection
     |
     v
Planning
     |
     +-------------------+
     |                   |
     v                   v
RAG Selection      Model Selection
     |                   |
     v                   v
Repository          Provider / Model
Retrieval                |
     |                   |
     +---------+---------+
               |
               v
        Context Builder
               |
               v
           Reasoning
               |
               v
        Model Generation
               |
               v
        Tool Execution
               |
               v
          Verification
               |
        +------+------+
        |             |
        v             v
     Success      Repair /
        |         Fallback
        v             |
   Final Result <-----+
```

The goal is to make the model operate as an engineering agent rather than simply as a conversational chatbot.

---

## Repository Understanding

When CodeForge is started inside a project, it builds a repository index.

Repository-aware requests can use that index to locate relevant source files and provide repository evidence to the model.

Examples:

```text
> explain this repository
> explain the architecture of this project
> where is model fallback implemented?
> find all files involved in repository retrieval
> explain how routing and model selection work together
```

CodeForge retrieves relevant repository information, ranks the evidence, and constructs context for the selected model.

---

## Retrieval-Augmented Generation

CodeForge includes a repository retrieval system designed to provide the model with relevant project context.

The retrieval system can use information such as:

- Repository structure
- Source files
- Symbols
- Imports
- Exports
- Function calls
- Comments
- TODOs
- Diagnostics
- File metadata
- Lexical retrieval
- Ranking
- Context budgeting

This allows repository-specific requests to be grounded in the actual project instead of relying exclusively on the model's general knowledge.

---

## Repository Parsing

CodeForge uses Tree-sitter for source-code parsing.

The current package includes language grammars for:

- C
- C++
- C#
- Go
- Java
- JavaScript
- PHP
- Python
- Ruby
- Rust
- Swift
- TypeScript

The parser extracts structural information that can be used by repository retrieval and analysis.

---

## AI Model Routing

CodeForge includes model-role selection.

Depending on the request, the system can select an appropriate model role for the task.

Configured roles can include:

- General conversation
- Planning
- Coding
- Reviewing
- Reasoning
- Model selection

The terminal reports the selected provider and model after execution.

Example:

```text
Model Usage
Route        openrouter · nvidia/nemotron-3-super-120b-a12b:free
Attempts     1
Prompt       ...
Completion   ...
Reasoning    ...
Total        ...
Cost         $0
Finish       stop
```

---

## Model Fallback

CodeForge supports fallback behavior when a model/provider request encounters a retryable failure.

The agent can select a configured fallback model and retry the request rather than immediately terminating the workflow.

This helps keep engineering workflows resilient when a particular model route is temporarily unavailable.

---

## Tool System

CodeForge provides tools that allow the agent to interact with the repository and local development environment.

Current tool capabilities include:

- Read files
- Search files
- Edit files
- Write files
- Execute shell commands

The model can request tools when the task requires direct interaction with the project.

For example:

```text
> explain src/auth.js
```

may result in a direct file read.

A coding request such as:

```text
> fix the bug in src/auth.js and run the tests
```

can involve:

```text
Read
  |
  v
Analyze
  |
  v
Edit
  |
  v
Execute tests
  |
  v
Inspect result
  |
  v
Repair if necessary
```

---

## Command Approval

CodeForge includes an approval boundary around command execution.

When a command requires approval, CodeForge can ask the user before executing it.

Example:

```text
Approval required: execute_command

Command:
npm test

Approve this operation? [y/N]
```

The user can explicitly approve or deny the operation.

This provides an additional safety boundary around potentially destructive operations.

---

## Code Modification

CodeForge is designed to perform engineering tasks, not only answer questions.

Examples:

```text
> add input validation to the login function
> refactor this function without changing its behavior
> fix the failing tests
> add error handling to the API client
> update the authentication flow and run the relevant tests
```

The agent can combine repository context, file tools, command execution, and verification during these workflows.

---

## Verification

CodeForge does not treat a successful file modification as automatically completing an engineering task.

For implementation and debugging workflows, the system can track whether the change has been verified.

A typical workflow is:

```text
Understand
    |
    v
Plan
    |
    v
Retrieve Context
    |
    v
Modify Code
    |
    v
Run Verification
    |
    v
Inspect Result
    |
    v
Repair if Necessary
    |
    v
Complete
```

The project test suite currently covers retrieval, routing, model selection, fallback behavior, tool execution, approval handling, verification, and configuration.

Current test status:

```text
112 tests
112 passed
0 failed
```

---

## Git Awareness

CodeForge can operate inside Git repositories and inspect repository state.

This allows repository-aware tasks to take Git context into account, including:

- Current branch
- Working-tree state
- Repository status
- Git-related project information

Example:

```text
> inspect the current git changes and explain what they do
```

---

## Terminal Dashboard

CodeForge provides live terminal activity during execution.

A typical request can display:

```text
✓ Understood request
✓ Planned approach
✓ Searched repository
✓ Built context
✓ Selected model
✓ Reasoning configured
✓ Generated response
```

Tool-enabled workflows can additionally show:

```text
✓ Completed tool
✓ Completed tool round
✓ Verification completed
```

This makes the agent's execution pipeline visible without exposing private model chain-of-thought.

---

## Context Usage

After execution, CodeForge reports estimated context usage.

Example:

```text
Context Usage
Round 0
  System       ~1,934 tokens
  User/RAG     ~1,067 tokens
  Assistant    ~0 tokens
  Tool Results ~0 tokens
  Tool Schemas ~677 tokens
  Estimated    ~3,676 tokens
```

This helps users understand how much repository and tool context was supplied to the model.

---

## Model Usage

CodeForge also reports model usage information.

Example:

```text
Model Usage
Route        openrouter · nvidia/nemotron-3-super-120b-a12b:free
Attempts     1
Prompt       3,941 tokens
Completion   550 tokens
Reasoning    355 tokens
Total        4,491 tokens
Cost         $0
Finish       stop
```

The exact values depend on the request and selected model.

---

## Example Session

A normal CodeForge session looks like:

```text
$ codeforge

CodeForge AI v1.0.2
Terminal-Native AI Software Engineering Agent
────────────────────────────────────────────────────────────

✔ Configuration loaded.
✔ Project: my-project
ℹ Building repository index...
✔ Repository indexed.
✔ OpenRouter provider initialized.
✔ Tool registry initialized.
✔ CodeForge initialized.
✔ Loaded project: my-project

> hello
```

The agent can respond to normal conversational requests:

```text
> hello

Hello! How can I assist you today?
```

Repository-aware requests activate retrieval when appropriate:

```text
> explain this repository
```

Coding requests can activate tools:

```text
> explain src/math.js
```

or:

```text
> fix the bug in src/math.js and run the tests
```

---

## Example Requests

**General Conversation**
```text
> hello
> what can you do?
```

**Repository Explanation**
```text
> explain this repository
```

**Architecture**
```text
> explain how the routing system works
> explain how model selection and fallback interact
```

**File Explanation**
```text
> explain src/math.js
```

**Search**
```text
> find where authentication is implemented
```

**Debugging**
```text
> find why the tests are failing
```

**Code Modification**
```text
> fix the failing test and verify the fix
```

**Refactoring**
```text
> refactor this module while preserving its current behavior
```

---

## Configuration

CodeForge currently uses OpenRouter for model access.

The primary environment variable is:

```text
OPENROUTER_API_KEY
```

Example:

```bash
export OPENROUTER_API_KEY="sk-or-..."
```

Windows CMD:

```cmd
set OPENROUTER_API_KEY=sk-or-...
```

The configuration system also supports configured model roles and environment-variable overrides where supported.

---

## Security

CodeForge is an engineering agent with access to local project files and, when approved, command execution.

Use it only in environments where you understand the operations it may perform.

### API Keys

Never commit:

```text
OPENROUTER_API_KEY
```

or other secrets to source control.

Add environment files to `.gitignore`:

```text
.env
.env.local
```

### Command Execution

Review command-approval prompts carefully.

Do not approve commands you do not understand.

---

## Installation on Another Machine

CodeForge is distributed through npm, so another developer does not need the project's `.tgz` file.

On another machine with Node.js 22.13+:

```bash
npm install -g @oisheek_c/codeforge
```

Then verify:

```bash
codeforge --version
```

Configure the API key:

```bash
export OPENROUTER_API_KEY="your_api_key_here"
```

Navigate into a project:

```bash
cd your-project
```

Then start CodeForge:

```bash
codeforge
```

CodeForge can therefore be installed and used directly from the npm registry.

---

## Development

Clone the repository:

```bash
git clone <repository-url>
```

Enter the repository:

```bash
cd codeforge
```

Install dependencies:

```bash
pnpm install
```

Run CodeForge locally:

```bash
pnpm start
```

Run the test suite:

```bash
node --test
```

or:

```bash
pnpm test
```

---

## Testing

The project contains automated tests covering major parts of the agent architecture.

Current verified result:

```text
ℹ tests 112
ℹ pass 112
ℹ fail 0
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
```

Run the tests with:

```bash
node --test
```

---

## Package Information

- **Current npm package:** `@oisheek_c/codeforge`
- **Current release:** `1.0.2`
- **CLI command:** `codeforge`
- **Required Node.js version:** `>= 22.13.0`

Install:

```bash
npm install -g @oisheek_c/codeforge
```

---

## Project Structure

The project is organized into several major subsystems:

```text
apps/
└── cli/
    └── src/
        ├── bootstrap.js
        ├── cli.js
        ├── index.js
        └── dev/

packages/
├── agent/
├── config/
├── core/
├── git/
├── memory/
├── prompts/
├── providers/
├── reasoning/
├── retrieval/
├── scanner/
├── terminal/
├── tools/
└── utils/

bin/
└── codeforge.js
```

The main architectural areas are:

| Package | Responsibility |
|---|---|
| agent | Agent orchestration, planning, routing, and execution |
| config | Configuration and model settings |
| core | Core types and engineering abstractions |
| git | Git integration |
| memory | Project and session memory |
| prompts | Prompt construction |
| providers | AI provider integration |
| reasoning | Reasoning workflows |
| retrieval | Repository parsing, indexing, ranking, and RAG |
| scanner | Repository scanning |
| terminal | CLI dashboard and terminal rendering |
| tools | File and command tools |
| utils | Shared utilities |

---

## Architecture

At a high level:

```text
                    ┌─────────────────────┐
                    │     User / CLI      │
                    └──────────┬──────────┘
                               │
                               ▼
                    ┌─────────────────────┐
                    │   Intent / Planner  │
                    └──────────┬──────────┘
                               │
                  ┌────────────┴────────────┐
                  ▼                         ▼
        ┌─────────────────┐       ┌─────────────────┐
        │   RAG Selector  │       │ Model Selector  │
        └────────┬────────┘       └────────┬────────┘
                 │                         │
                 ▼                         ▼
        ┌─────────────────┐       ┌─────────────────┐
        │   Retrieval     │       │    Provider     │
        │   / Repository  │       │   / OpenRouter  │
        └────────┬────────┘       └────────┬────────┘
                 │                         │
                 └────────────┬────────────┘
                              ▼
                    ┌─────────────────────┐
                    │   Context Builder   │
                    └──────────┬──────────┘
                               │
                               ▼
                    ┌─────────────────────┐
                    │      Reasoning      │
                    └──────────┬──────────┘
                               │
                               ▼
                    ┌─────────────────────┐
                    │   Model Generation  │
                    └──────────┬──────────┘
                               │
                               ▼
                    ┌─────────────────────┐
                    │   Tool Execution    │
                    └──────────┬──────────┘
                               │
                               ▼
                    ┌─────────────────────┐
                    │     Verification    │
                    └──────────┬──────────┘
                               │
                    ┌──────────┴──────────┐
                    ▼                     ▼
                 Success              Repair /
                    │                 Fallback
                    ▼                     │
               Final Result ◄─────────────┘
```

---

## Current Release

**v1.0.2**

The current release includes:

- Terminal-native interactive agent
- OpenRouter integration
- Model-role selection
- Model fallback routing
- Repository indexing
- Repository retrieval
- RAG selection
- Tree-sitter source parsing
- Multi-language parsing
- File reading
- File searching
- File editing
- File writing
- Shell command execution
- Command approval
- Git awareness
- Engineering verification workflow
- Terminal activity dashboard
- Context telemetry
- Model usage telemetry

---

## Project Status

CodeForge is an actively developed project.

The core agent workflow is functional and distributed through npm.

Current development focus includes:

- Repository safety
- Retrieval quality
- Parser compatibility
- Developer experience
- Documentation
- CLI reliability
- Package quality

---

## Roadmap

Planned improvements include:

- Further retrieval-quality improvements
- Better repository-level architectural understanding
- Improved parser compatibility
- Reduction of Tree-sitter dependency warnings
- Safer behavior when launched outside a project directory
- Additional engineering workflows
- Expanded documentation
- Continued CLI UX improvements
- Additional provider and model flexibility

---

## Contributing

Contributions, bug reports, feature requests, and improvements are welcome.

Before submitting changes:

1. Make the change.
2. Run the test suite.
3. Verify the CLI manually where appropriate.
4. Review the Git diff.
5. Submit the change with a clear description.

Run:

```bash
node --test
```

before opening a pull request.

---

## Troubleshooting

### `codeforge` command not found

Check whether the package is installed globally:

```bash
npm list -g --depth=0
```

You should see:

```text
@oisheek_c/codeforge@1.0.2
```

Check the npm global prefix:

```bash
npm prefix -g
```

Make sure the corresponding global bin directory is available in your PATH.

### Check the installed version

```bash
codeforge --version
```

Expected:

```text
CodeForge AI v1.0.2
```

### OpenRouter authentication failure

Check that the environment variable exists.

**macOS / Linux**
```bash
echo "$OPENROUTER_API_KEY"
```

**Windows CMD**
```cmd
echo %OPENROUTER_API_KEY%
```

If necessary, set it again and restart the terminal.

### Repository indexing permission errors

Run CodeForge from the root of the project you want it to work with:

```bash
cd path/to/project
codeforge
```

Avoid starting CodeForge from directories containing unrelated system data or directories for which the current user does not have read permission.

---

## License

MIT License.

## Author

**Oisheek**

CodeForge AI is developed as a terminal-native AI software engineering project.

## Links

- [npm Package](https://www.npmjs.com/package/@oisheek_c/codeforge)
- [GitHub](https://github.com/Oisheek/codeforge)

---

*CodeForge AI — AI software engineering directly in your terminal.*
