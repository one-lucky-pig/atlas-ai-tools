export type StudioJobId = "generate" | "validate" | "build" | "scheduler-once";

export interface StudioJobDefinition {
  id: StudioJobId;
  label: string;
  command: string[];
}

const jobs: StudioJobDefinition[] = [
  {
    id: "generate",
    label: "生成数据包",
    command: ["npm", "run", "generate"]
  },
  {
    id: "validate",
    label: "校验内容包",
    command: ["npm", "run", "validate"]
  },
  {
    id: "build",
    label: "构建静态站点",
    command: ["npm", "run", "build"]
  },
  {
    id: "scheduler-once",
    label: "执行一次调度器",
    command: ["npm", "run", "scheduler", "--", "--once"]
  }
];

export function listStudioJobs(): StudioJobDefinition[] {
  return jobs.map((job) => ({ ...job, command: [...job.command] }));
}

export function getStudioJobDefinition(id: StudioJobId): StudioJobDefinition {
  const job = jobs.find((candidate) => candidate.id === id);
  if (!job) {
    throw new Error(`Unknown studio job: ${id}`);
  }

  return {
    ...job,
    command: [...job.command]
  };
}
