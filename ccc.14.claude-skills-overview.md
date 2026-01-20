# Claude Code Skills Overview

**Date**: 2026-01-19
**Purpose**: Quick reference for understanding and using Claude Code skills

---

## What is a Skill?

A Claude Code skill is a markdown file that teaches Claude how to do something specific. Unlike slash commands that you invoke explicitly, **skills are automatically discovered and applied** by Claude when your request matches the skill's purpose.

---

## Skill Structure

A skill is a **directory** containing at minimum a `SKILL.md` file:

```
expo-starter/
├── SKILL.md              # Required - metadata + instructions
├── templates/            # Optional - template files
├── scripts/              # Optional - helper scripts
└── docs/                 # Optional - additional documentation
```

### SKILL.md Format

The `SKILL.md` has YAML frontmatter followed by markdown instructions:

```yaml
---
name: expo-starter
description: >
  Set up an Expo + React Native + TypeScript development environment.
  Use when starting a new cross-platform mobile/web app project.
allowed-tools: Read, Write, Edit, Bash, Glob, Grep
---

# Instructions for Claude

Detailed step-by-step instructions go here...
```

### Key Metadata Fields

| Field | Required | Purpose |
|-------|----------|---------|
| `name` | Yes | Skill identifier (lowercase, hyphens, numbers only) |
| `description` | Yes | What it does + when to use (Claude uses this to decide when to apply) |
| `allowed-tools` | No | Tools Claude can use (e.g., `Read, Bash, Write`) |
| `model` | No | Override the model used |
| `context` | No | Set to `fork` to run in isolated sub-agent |

---

## Installation

### Installation Locations

| Location | Path | Scope |
|----------|------|-------|
| **Personal** | `~/.claude/skills/skill-name/` | All your projects |
| **Project** | `.claude/skills/skill-name/` | Anyone in that repo |

### How to Install

Just copy the skill directory to one of the locations above:

```bash
# Personal installation (available in all projects)
cp -r expo-starter ~/.claude/skills/

# Project installation (available to project collaborators)
cp -r expo-starter .claude/skills/
```

No registration command needed - Claude discovers skills automatically.

---

## How to Use

### Automatic Discovery

Skills are **automatically discovered** by Claude based on the `description` field. When your request matches what the skill does, Claude will use it.

For example, with an `expo-starter` skill installed, any of these would trigger it:
- "Set up a new Expo project for a todo app"
- "Create a React Native app with TypeScript"
- "I need a cross-platform mobile starter app"

### Explicit Invocation

You can also invoke a skill explicitly using slash syntax:

```
/expo-starter
/expo-starter my-new-app
```

### Verification

To confirm Claude sees your skill:
- Ask: "What skills do you have available?"
- Or make a request that matches the skill's description

---

## What You Don't Need to Do

- No activation/registration step
- No config file changes
- No restart required
- No explicit invocation needed (though you can)

Claude reads skill descriptions at session start and automatically applies relevant skills when your request matches.

---

## Skills vs Other Claude Code Features

| Feature | Purpose | Invoked By |
|---------|---------|------------|
| **Skills** | Specialized knowledge/workflows | Claude automatically (or `/skill-name`) |
| **Slash Commands** | Quick reusable prompts | You type `/command` |
| **CLAUDE.md** | Project-wide instructions | Always loaded for project |
| **Hooks** | Automation on tool events | Triggered by events |
| **MCP Servers** | External tools/data sources | Claude calls as needed |

---

## Best Practices for Skill Descriptions

A good description answers two questions:

1. **What does this skill do?** - List specific capabilities
2. **When should Claude use it?** - Include trigger terms users would mention

**Bad**: "Helps with projects"

**Good**: "Set up an Expo + React Native + TypeScript development environment with NativeWind styling and Expo Router navigation. Use when starting a new cross-platform mobile/web app project, creating an Expo project, or setting up React Native development."

---

## Quick Reference

```bash
# Create a personal skill
mkdir -p ~/.claude/skills/my-skill
cat > ~/.claude/skills/my-skill/SKILL.md << 'EOF'
---
name: my-skill
description: What it does and when to use it
---

# Instructions
...
EOF

# Create a project skill
mkdir -p .claude/skills/my-skill
# Same SKILL.md structure
```

---

## References

- [Claude Code Documentation](https://docs.anthropic.com/claude-code)
- Related project docs:
  - [ccc.13.prompt-for-claude-skill-dev-env-starter-app.md](ccc.13.prompt-for-claude-skill-dev-env-starter-app.md) - Prompt for creating the expo-starter skill

---

**Document Version**: 1.0
**Created**: 2026-01-19
