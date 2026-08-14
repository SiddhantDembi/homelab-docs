---
title: "Local AI & LLM Automation Platform"
description: "Building a GPU-accelerated local AI environment for private LLM inference, autonomous agents, workflow automation and image generation."
order: 2
tags:
  - Local AI
  - Ollama
  - Open WebUI
  - Automation
  - GPU
---

## Overview

My local AI platform is a self-hosted environment for experimenting with large language models, autonomous agents, workflow automation and image generation without depending entirely on hosted AI services.

The platform runs inside my Proxmox homelab on the custom-built server equipped with an NVIDIA RTX 3060 12 GB GPU. A dedicated AI virtual machine uses GPU passthrough to access the graphics card directly, allowing local models and image-generation workloads to benefit from hardware acceleration while remaining isolated from the rest of the infrastructure.

The core environment combines Ollama for serving open-source language models, Open WebUI for browser-based interaction, Hermes Agent for autonomous workflows, Prometheus and Grafana for monitoring, n8n for automation, and Stable Diffusion for local image-generation experiments.

## Goals

- Run open-source language models locally with GPU acceleration.
- Keep prompts, conversations and experimental workloads within the homelab.
- Provide a simple browser interface for interacting with different models.
- Explore autonomous agents that can use local models and external integrations.
- Connect AI capabilities to repeatable automation workflows.
- Monitor GPU memory usage and system performance during inference.
- Experiment with local image generation alongside language-model workloads.

## Architecture

The Local AI platform is split across dedicated virtual machines on the second Proxmox host. The AI VM handles GPU-accelerated inference and supporting services, while a separate Agent VM provides an isolated environment for autonomous-agent experiments.

The custom server's RTX 3060 is passed through to the AI VM, giving the guest operating system direct access to the GPU. Ollama runs the language models, and Open WebUI connects to Ollama to provide a user-friendly interface for conversations and model management.

Hermes Agent runs with locally hosted Qwen and Gemma Mixture-of-Experts models. A Telegram integration provides a convenient way to interact with the agent remotely while keeping model inference inside the homelab.

<div class="table-wrapper">

| Layer | Components | Role |
| :--- | :--- | :--- |
| AI VM | RTX 3060 12 GB GPU passthrough, Ollama, Open WebUI, Stable Diffusion | Local language-model inference and image generation |
| Agent VM | Hermes Agent, local Qwen and Gemma MoE models, Telegram integration | Autonomous workflows and remote interaction |
| Monitoring | Prometheus and Grafana | GPU memory and AI VM performance visibility |
| Automation | n8n | Connecting AI services to repeatable workflows and other applications |

</div>

## Local LLM Inference

Ollama acts as the model-serving layer for the platform. It provides a consistent way to download, run and switch between open-source models without configuring a separate inference stack for each experiment.

Open WebUI sits in front of Ollama and provides a browser-based interface similar to a hosted AI chat application. This makes the local models easier to test and use from other devices on the network while keeping inference on the dedicated AI VM.

The RTX 3060's 12 GB of VRAM provides hardware acceleration for models that fit within its available memory. Model selection therefore involves balancing capability, quantization and context requirements against GPU memory usage and acceptable response speed.

## Autonomous Agent Workflows

Hermes Agent extends the platform beyond standard chat interactions. It runs against local Qwen and Gemma MoE models and provides a foundation for experimenting with autonomous workflows, tool use and multi-step tasks.

The agent is kept in a separate VM so its dependencies and experiments remain isolated from the core inference services. This separation also makes it easier to rebuild or modify the agent environment without disrupting Ollama and Open WebUI.

Telegram integration provides a lightweight remote interface to the agent. Requests can be sent through a familiar messaging application, while the underlying model continues to run locally on the homelab infrastructure.

## Monitoring

Local inference can place sustained load on the GPU, particularly when switching models or running multiple experiments. Prometheus collects performance metrics from the AI environment, and Grafana displays those metrics through dashboards.

The monitoring setup focuses on GPU memory usage and the performance of the dedicated AI VM. This makes it easier to understand how different models affect resource consumption, identify workloads approaching the GPU's limits and compare the behavior of different configurations.

Monitoring is especially useful when an inference request feels slow or a model fails to load. Instead of treating the AI stack as a black box, the dashboards provide visibility into the underlying resource constraints.

## Workflow Automation

n8n provides the workflow-automation layer for the platform. It allows AI services to be connected to triggers, APIs and other self-hosted applications through repeatable visual workflows.

This creates a path from isolated model experiments to practical automations. A local model or agent can become one step in a larger workflow, with n8n coordinating how information enters the system, how it is processed and where the result is delivered.

Keeping n8n inside the homelab also makes it possible to integrate local services without exposing each one directly to the public internet.

## Local Image Generation

Stable Diffusion is deployed for experimenting with local image generation on the same GPU-enabled infrastructure. It provides a different type of AI workload from language-model inference and helps test how the platform handles GPU-intensive visual generation.

Running both language and image models locally makes resource planning important. GPU memory is finite, so workloads need to be selected and scheduled with the available VRAM in mind rather than assuming every model can remain loaded at the same time.

## Challenges & Lessons

GPU passthrough adds complexity compared with running an ordinary virtual machine. The Proxmox host, VM configuration, drivers and guest operating system all need to work together before applications inside the VM can use the GPU reliably.

Model size is another practical constraint. A more capable model is not automatically the best choice for local use if it exceeds the available VRAM or responds too slowly for the intended workflow. Testing Qwen, Gemma MoE and other open-source models has made model selection an exercise in balancing quality, speed and resource usage.

Separating the core AI services from the autonomous-agent environment has also been useful. Isolation reduces the impact of experimental changes and keeps the primary Ollama and Open WebUI environment available while agent configurations evolve.

Finally, monitoring turns performance tuning into a measurable process. GPU memory and VM metrics make it easier to compare workloads and understand whether a limitation comes from the model, the GPU or the surrounding virtual machine.

## Conclusion

The Local AI and LLM Automation Platform extends the homelab from traditional self-hosting into private, GPU-accelerated AI experimentation.

Ollama and Open WebUI provide the core inference experience, Hermes Agent and Telegram support autonomous interactions, n8n connects AI to broader workflows, and Stable Diffusion adds local image generation. Prometheus and Grafana provide the visibility needed to operate those workloads within the limits of the available hardware.

The platform remains an evolving environment for comparing models, testing agent workflows and finding practical ways to integrate locally hosted AI into the rest of the homelab.
