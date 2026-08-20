const toolNames = [
  "Read", "Bash", "Glob", "Grep", "Edit", "Write", "Agent", "Skill",
  ...Array.from({ length: 34 }, (_, index) => `demo_tool_${String(index + 9).padStart(2, "0")}`),
];

const tools = toolNames.map((name, index) => ({
  name,
  description: `脱敏演示工具 ${index + 1}。用于展示工具说明与 JSON Schema 会进入模型上下文；这里不包含真实项目内容或参数。`,
  input_schema: {
    type: "object",
    properties: {
      target: { type: "string", description: "演示目标，不会执行真实操作。" },
      options: { type: "array", items: { type: "string" } },
    },
    required: ["target"],
  },
}));

export const DEMO_REQUEST_TEXT = JSON.stringify({
  request: {
    model: "claude-sonnet-demo",
    max_tokens: 4096,
    system: [
      { type: "text", text: "You are a local request anatomy demonstration." },
      { type: "text", text: "Follow the user task while respecting the visible tool contract." },
      { type: "text", text: "This sanitized block represents longer harness instructions and cacheable context.", cache_control: { type: "ephemeral" } },
      {
        type: "text",
        text: "Project instructions are sanitized. <memory>Preferred output language: Chinese. Keep token estimates clearly labeled.</memory> Remaining skill documentation stays in System.",
        cache_control: { type: "ephemeral" },
      },
    ],
    tools,
    messages: [
      {
        role: "user",
        content: Array.from({ length: 6 }, (_, index) => ({ type: "text", text: `脱敏历史上下文片段 ${index + 1}。` })),
      },
      {
        role: "assistant",
        content: [
          { type: "thinking", thinking: "Sanitized reasoning placeholder." },
          { type: "text", text: "我会先查看演示数据结构。" },
        ],
      },
      { role: "user", content: [{ type: "text", text: "请分析这次 Request 的组成。" }] },
      {
        role: "assistant",
        content: [
          { type: "thinking", thinking: "Sanitized tool decision." },
          { type: "tool_use", id: "toolu_demo_01", name: "Read", input: { target: "sanitized-demo.json" } },
        ],
      },
      {
        role: "user",
        content: [{ type: "tool_result", tool_use_id: "toolu_demo_01", content: "Sanitized local tool result." }],
      },
    ],
  },
  response: {
    usage: {
      input_tokens: 374,
      cache_creation_input_tokens: 0,
      cache_read_input_tokens: 19673,
      output_tokens: 87,
    },
  },
}, null, 2);
