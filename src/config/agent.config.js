const AGENT_WITH_DESCRIPTIONS = [
  {
    name: "IT",
    description: "IT Agent: technical issues, software problems, computer questions, IT infrastructure, technical support, system related questions, password"
  },
  {
    name: "HR",
    description: "HR Agent: employee policies, benefits, workplace issues, hiring, training, employee relations"
  },
  {
    name: "FINANCE",
    description: "Finance Agent: budget questions, expenses, financial reports, accounting, investments, financial planning, reimbursement queries, allowances"
  },
  {
    name: "WEB_SEARCH",
    description: "Web Search Agent: general information, facts, current events, or anything not fitting the other categories"
  }
];

module.exports = {
  AGENT_WITH_DESCRIPTIONS,
  getAgentDescription: (agentName) => AGENT_WITH_DESCRIPTIONS.find(agent => agent.name === agentName)?.description
}; 