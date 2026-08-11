/**
 * Server-only helper that calls Railway's GraphQL API to restart (redeploy)
 * the ParentPulse worker service. Never import this from client code.
 */

const RAILWAY_API_URL = 'https://backboard.railway.app/graphql/v2';

interface RestartResult {
  success: boolean;
  message: string;
}

async function callRailwayMutation(
  apiToken: string,
  mutationName: 'serviceInstanceRedeploy' | 'serviceInstanceDeploy',
  serviceId: string,
  environmentId: string,
): Promise<RestartResult> {
  const query = `
    mutation ${mutationName}($serviceId: String!, $environmentId: String!) {
      ${mutationName}(serviceId: $serviceId, environmentId: $environmentId)
    }
  `;

  const response = await fetch(RAILWAY_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiToken}`,
    },
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

  try {
    const primary = await callRailwayMutation(apiToken, 'serviceInstanceRedeploy', serviceId, environmentId);
    if (primary.success) return primary;

    const isFieldMissing =
      primary.message.toLowerCase().includes('cannot query field') ||
      primary.message.toLowerCase().includes('unknown field');

    if (!isFieldMissing) return primary;

    const fallback = await callRailwayMutation(apiToken, 'serviceInstanceDeploy', serviceId, environmentId);
    return fallback;
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Unknown error calling Railway',
    };
  }
}

