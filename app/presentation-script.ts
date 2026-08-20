export const speakerScripts = [
  {
    section: "Opening",
    title: "Title",
    script: `Hi everyone. It's me, Jeff again.
I've been giving presentations pretty often lately, so maybe one day I can steal the Evangelist title from Marty.
Anyway, back to today's topic.

I want to start with one simple question:
What actually happens after you press Send in Claude Code?

We type a request, press Send, and a few seconds later Claude starts reading files, running commands, and changing code.
But what's actually happening behind the scenes?

Before we inspect a real request, let's first focus on how Claude Code works.`,
  },
  {
    section: "Opening",
    title: "Model vs Harness",
    script: `Claude Code is an agentic coding tool.
There are two parts we need to know:

• the Claude model.
• the Claude Code harness.

The model does the thinking and decides what to do next.
The harness handles the work around it: building the context, running tools, and managing the session.

So, one important thing to remember:
One request doesn't always mean one API call.

Claude may make several calls before it finishes a task.
For example, it might read something, get the result, decide what to do next, run another tool, get another result, and keep going.
That's basically the agent loop.

Another interesting recent development is that DeepSeek has also released its own agent harness.
So it could be interesting to compare the two.
Maybe that's another talk... for someone else.`,
  },
  {
    section: "ReAct and the Agent Loop",
    title: "ReAct-like Agent Loop",
    script: `There's a concept called ReAct, which stands for Reasoning and Acting.
For today, just think of it as a loop:

Think
→ Do something
→ Get the result
→ Think again

That's it.
That's why you may see Claude go through several rounds before it finishes a task.
It does something, gets new information, and then decides what to do next.
And the loop keeps going until the task is done.`,
  },
  {
    section: "What Goes Into the Request?",
    title: "What Goes Into the Request?",
    script: `Before Claude can make that first decision, the harness needs to build the context.
At a high level, you can think of the order like this:

System Layer
→ Project Context
→ Conversation
→ Latest User Message

The system layer contains the core instructions and tool definitions.
Project context can include things like CLAUDE.md, project rules, and memory.
Then comes the conversation so far.
And finally, our latest message.

That's enough detail for now.
But remember this order.
There'll be a quiz later.`,
  },
  {
    section: "Tools and the Agent Loop",
    title: "Agent Loop",
    script: `Now Claude has some context and can start working.
But for some coding tasks, the information it needs isn't there yet.
Maybe it needs to know what's inside a file, find where a function is defined, or run a test.

That's where tools come in.
Claude Code has tools such as:

Read
Write
Edit
Bash
Grep
Glob

Read reads files.
Grep searches for content inside files.
Glob finds files based on their names or paths.
Edit and Write change files.
And Bash runs commands.

The model can request one of these tools.
Then the harness receives that request, checks things like permissions, runs the tool locally, and sends the result back to Claude.

And we're back to the same loop we talked about before:

Model decides
→ Requests a tool
→ Harness runs it
→ Result comes back
→ Model decides again`,
  },
  {
    section: "Streaming, Compaction and Stop Reason",
    title: "Streaming, Compaction and Stop Reason",
    script: `A couple of other things are happening around this loop.

First, streaming.
Claude doesn't need to wait for the whole response before showing us something.
The API can stream events back as they're generated, and the client processes them as they arrive.
That's why we see the answer appearing gradually on screen.

The second thing is compaction.
As the conversation gets longer, the context gets bigger too.
Claude Code can reduce older tool output and summarize older conversation history to keep the context manageable.
That's basically what context compaction does.

Last but not least, one thing that's useful when we inspect the traffic is stop_reason.
For the normal agent loop, we only need to remember two common values.

If we see:

tool_use

it means Claude wants to use a tool.

If we see:

end_turn

Claude is finished with that turn.
We'll look at both of these in the actual traffic.`,
  },
  {
    section: "Prompt Cache",
    title: "What Is Prompt Cache?",
    script: `Okay.
Quiz time.
A few slides ago, I asked you to remember the order of the context.
Anyone remember why that order might matter?

One big reason is Prompt Cache.
Every time Claude makes another model call, it still needs the context for that call.
So a lot of the same information may be sent again.
But most of it hasn't changed.

Prompt Cache lets Claude reuse parts of a prompt it has already processed.
The key idea is:
Exact prefix matching.`,
  },
  {
    section: "Prompt Cache",
    title: "Why Order Matters",
    script: `So imagine the request has two parts:

Stable                                  Dynamic
──────────────────────────────────────────────►

System
→ Tools
→ Project Context
→ Conversation
→ Latest User Message

Stable things go first.
Things that change more often go later.

If the beginning stays the same, Claude can reuse more of that cached prefix.
But if something changes near the beginning, the cache match can break much earlier.

So the simple idea is:

Stable content first
→ more cache reuse
→ less repeated processing
→ lower cost and latency

And this is something we can actually see in the traffic.
In the request, we may see something like:

"cache_control": {
  "type": "ephemeral",
  "ttl": "5m"
}

This tells us how the cache is configured.

Then in the usage information, we can look for fields such as:

cache_creation_input_tokens
cache_read_input_tokens

cache_creation_input_tokens tells us how many input tokens were written to the cache.
cache_read_input_tokens tells us how many were reused from the cache.

So Prompt Cache reduces repeated processing, which can lower input cost and latency.`,
  },
  {
    section: "Memory",
    title: "Persistent Memory",
    script: `Next, memory.
Claude Code mainly has two ways to carry useful information across sessions:
CLAUDE.md and Auto Memory.

CLAUDE.md is written by us.
It can contain project rules, coding standards, architecture decisions, commands, or other instructions we want Claude to know.

There are different levels:

Managed Policy
→ User
→ Project
→ Local

Claude loads them from the broader scope to the more specific scope.
So the broader instructions come first, and the more specific instructions come later.
They're loaded together rather than simply replacing each other.

The other one is Auto Memory.
This is information Claude can save itself while it works.
For example:

Useful commands
Debugging findings
Project patterns
Preferences

So, in simple terms:
CLAUDE.md is information we give Claude.
Auto Memory is information Claude can learn and save while it works.`,
  },
  {
    section: "Subagents",
    title: "Subagents",
    script: `Finally, Subagents.
For a bigger task, Claude can split some of the work into separate agents.
For example:

Main Agent

├── Frontend investigation
├── Backend investigation
└── Test investigation

Each Subagent has its own context window and focuses on one part of the task.
When it's done, it sends the useful result back to the main agent.

Claude may decide to use a Subagent itself.
But we can also explicitly ask Claude Code to use one in our prompt.
For example:

Use the Explore subagent to investigate this.

Why would we do that?
The big reason is context isolation.

Imagine Claude needs to search through a lot of files and generate a lot of intermediate results.
If all of that stays in the main context, it can get noisy very quickly.
A Subagent can do that investigation in its own context and return the useful result to the main agent.

And if we have several independent tasks, some of them can also run in parallel.

This doesn't necessarily mean fewer tokens.
Depending on the task, it may actually use more.
But it gives us a cleaner way to organise the work and keep the main context under control.`,
  },
  {
    section: "Final Summary",
    title: "Final Takeaway",
    script: `So let's go back to the original question.
What happens after we press Send?

At a high level:

1. The harness builds the context.
2. The model decides what to do.
3. The model may request a tool.
4. The harness runs the tool.
5. The result goes back to the model.
6. The loop continues until the task is done.

And around that loop, we have a few other things:

• Streaming gives us the output as it arrives.
• Compaction keeps a growing context manageable.
• Prompt Cache reuses repeated context.
• Memory carries useful information across sessions.
• Subagents move focused work into separate contexts.

Now I've talked enough about the theory.
Let's look at a real Claude request and see what actually gets sent.`,
  },
] as const;
