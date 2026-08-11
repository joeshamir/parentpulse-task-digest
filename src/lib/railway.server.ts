/**
 * Server-only helper that calls Railway's GraphQL API to restart (redeploy)
 * the ParentPulse worker service. Never import this from client code.
 */

const RAILWAY_API_URL = 'https://backboard.railway.app/graphql/v2';

interface RestartResult {
  success: boolean;
  message: string;
}

type AuthMode = 'bearer' | 'project';

async function callRailwayMutation(
  apiToken: string,
  mutationName: 'serviceInstanceRedeploy' | 'serviceInstanceDeploy',
  serviceId: string,
  environmentId: string,
  authMode: AuthMode = 'bearer',
): Promise<RestartResult> {
  const query = `
    mutation ${mutationName}($serviceId: String!, $environmentId: String!) {
      ${mutationName}(serviceId: $serviceId, environmentId: $environmentId)
    }
  `;

  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (authMode === 'bearer') {
    headers['Authorization'] = `Bearer ${apiToken}`;
  } else {
    headers['Project-Access-Token'] = apiToken;
  }

  const response = await fetch(RAILWAY_API_URL, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      query,
      variables: { serviceId, environmentId },
    }),
  });


  if (!response.ok) {
    const text = await response.text().catch(() => '');
    return {
      success: false,
      message: `Railway returned HTTP ${response.status}${text ? `: ${text.slice(0, 200)}` : ''}`,
    };
  }

  const body = (await response.json()) as {
    errors?: Array<{ message: string }>;
    data?: Record<string, boolean | null>;
  };

  if (body.errors?.length) {
    return {
      success: false,
      message: body.errors.map((e) => e.message).join('; '),
    };
  }

  if (body.data?.[mutationName] !== true) {
    return {
      success: false,
      message: 'Railway did not confirm the restart. Check the service ID and environment ID.',
    };
  }

  return {
    success: true,
    message: 'Restart requested. The worker should be back online within 30–60 seconds.',
  };
}

/**
 * Trigger a redeploy of a Railway service in a specific environment.
 * Requires a Railway account API token with permission to manage the project.
 *
 * Railway has used both `serviceInstanceRedeploy` and `serviceInstanceDeploy`
 * in different API versions, so we try the canonical name first and fall
 * back to the alias if the field is not found.
 */
export async function restartRailwayService(options: {
  apiToken: string;
  serviceId: string;
  environmentId: string;
}): Promise<RestartResult> {
  const { apiToken, serviceId, environmentId } = options;

  const isFieldMissing = (message: string) =>
    message.toLowerCase().includes('cannot query field') ||
    message.toLowerCase().includes('unknown field');

  const isAuthError = (message: string) => {
    const m = message.toLowerCase();
    return (
      m.includes('not authorized') ||
      m.includes('unauthorized') ||
      m.includes('http 401') ||
      m.includes('http 403') ||
      m.includes('forbidden')
    );
  };

  async function attempt(authMode: AuthMode): Promise<RestartResult> {
    const primary = await callRailwayMutation(
      apiToken,
      'serviceInstanceRedeploy',
      serviceId,
      environmentId,
      authMode,
    );
    if (primary.success || !isFieldMissing(primary.message)) return primary;
    return callRailwayMutation(apiToken, 'serviceInstanceDeploy', serviceId, environmentId, authMode);
  }

  try {
    const bearer = await attempt('bearer');
    if (bearer.success) return bearer;

    // Project-scoped Railway tokens must be sent as `Project-Access-Token`
    // instead of a bearer token; retry with that header before giving up.
    if (!isAuthError(bearer.message)) return bearer;

    const project = await attempt('project');
    if (project.success) return project;

    return {
      success: false,
      message: `Railway rejected the request: ${project.message}. The Railway API token may need to be re-issued with account scope.`,
    };
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Unknown error calling Railway',
    };
  }
}


