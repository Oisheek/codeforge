export function buildContext(app, request) {
  return {
    request,

    config: app.config,

    project: app.project,

    git: app.git,

    tree: app.project.tree,

    timestamp: new Date().toISOString(),
  };
}