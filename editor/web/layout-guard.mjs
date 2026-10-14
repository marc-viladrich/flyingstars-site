// Run on the actual layout, including while a form field has focus.
export function horizontalLayoutViolations({clientWidth,scrollWidth,scrollLeft}){const issues=[];if(scrollWidth>clientWidth+1)issues.push('content exceeds available width');if(Math.abs(scrollLeft)>1)issues.push('inspector has scrolled horizontally');return issues;}
export function inspectHorizontalLayout(element){const metrics={clientWidth:element.clientWidth,scrollWidth:element.scrollWidth,scrollLeft:element.scrollLeft};return {...metrics,issues:horizontalLayoutViolations(metrics)};}
