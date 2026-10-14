// Smooth shortest-angle steering, independent of render frame rate.
export function turnToward(current,target,dt){return current+Math.atan2(Math.sin(target-current),Math.cos(target-current))*(1-Math.exp(-dt*9))}
export function gaitPose(phase,strength=1){const s=Math.sin(phase);return {hips:[s*.48*strength,-s*.48*strength],knees:[Math.max(0,-s)*.7*strength,Math.max(0,s)*.7*strength],arms:[-s*.34*strength,s*.34*strength],bob:(1-Math.cos(phase*2))*.018*strength,sway:Math.sin(phase)*.025*strength}}
