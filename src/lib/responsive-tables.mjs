export function responsiveTables() {
  return {
    name: 'responsive-tables',
    element: {
      filter: ['table'],
      visit(node, context) {
        context.wrapNode(node, {
          type: 'element',
          tagName: 'div',
          properties: {
            className: ['table-wrapper'],
            role: 'region',
            ariaLabel: 'Scrollable table',
            tabIndex: 0,
          },
          children: [],
        });
      },
    },
  };
}
