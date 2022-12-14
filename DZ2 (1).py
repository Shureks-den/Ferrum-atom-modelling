import OpenGL.GL as gl
import OpenGL.GLUT as glut
import numpy as np
import numpy.linalg as lg

#Global flags
flag_Emu = False
flag_Exit = False
flag_ShowTrace = True

#Window parameters
WINDOW_WIDTH = 600
WINDOW_HEIGHT = 600

#Camera parameters
CAMERA_R = 1
CAMERA_PHI = np.pi / 6
CAMERA_THETA = np.pi / 3
CAMERA_POSITION = np.zeros(3, dtype=float)
CAMERA_TARGET = np.array((0, 0, 0), dtype=float)
CAMERA_DIRECTION = 0
DIRECTION_UP = np.array((0, 0, 1), dtype=float)
CAMERA_RIGHT = 0
CAMERA_UP = 0
MAT_LOOK_AT = 0
VIEW_ORTHO = 0.85

#Visual bounds
CUBE_VERTICES = np.array([[-0.5, -0.5, -0.5],
                          [ 0.5, -0.5, -0.5],
                          [ 0.5, -0.5,  0.5],
                          [-0.5, -0.5,  0.5],
                          [-0.5,  0.5, -0.5],
                          [ 0.5,  0.5, -0.5],
                          [ 0.5,  0.5,  0.5],
                          [-0.5,  0.5,  0.5]])
CUBE_INDICES = np.array([[0, 1], [1, 2], [2, 3], [3, 0],
                         [0, 4], [1, 5], [2, 6], [3, 7],
                         [4, 5], [5, 6], [6, 7], [7, 4]])
#AXIS indicator
AXIS_VERTICES = np.array([[0.0,  0.0,  0.0],
                         [VIEW_ORTHO / 10, 0.0, 0.0],
                         [0.0, VIEW_ORTHO / 10, 0.0],
                         [0.0, 0.0,  VIEW_ORTHO / 10]])
AXIS_INDICES = np.array([[0, 1],[0, 2], [0, 3]])
AXIS_COLORS = np.array([[1, 0, 0], [0, 1, 0], [0, 0, 1]], dtype=float)
AXIS_POINT = np.array([VIEW_ORTHO / 20, VIEW_ORTHO / 20, VIEW_ORTHO / 20])

#Simulation parameters 

    ### USER'S INPUT ###
#(Nikkel)
# ALP =  1.4199
# EPS = 67.37  * 10 ** -21  #J
# MAS = 97.464 * 10 ** -27  #kg
# RM  =  2.78  * 10 ** -10  #m
#
#(Barium)
ALP =   0.65698
EPS =  22.69  * 10 ** -21  #J
MAS = 228.05 * 10 ** -27  #kg
RM  =   5.373  * 10 ** -10  #m

TAU_MULTIPLIER = 0.05  #[0.01; 0.05]
GRID_SIZE = 5
INI_DIST = 1 * 10**-16
INI_PAD = INI_DIST
INI_SPD = 1 * 10**-18
TRACKING_POINT = 62

    ### DON'T TOUCH  ###
SIM_TIME = 0
SIM_ITRS = 0
POINTS_AMOUNT = GRID_SIZE ** 3
BOX_SIZE = GRID_SIZE * INI_DIST + 2 * INI_PAD
BOX_VOL = BOX_SIZE ** 3
C = 2 * EPS * ALP ** 2
TAU = 2 * np.pi * np.sqrt(MAS / C) * TAU_MULTIPLIER

R_prev = np.zeros([POINTS_AMOUNT, 3], dtype=float)
R = np.zeros([POINTS_AMOUNT, 3], dtype=float)
V = np.zeros([POINTS_AMOUNT, 3], dtype=float)
    ### ____________ ###

print("TAU =", TAU)
print("C =", C)
print("INI_DIST", INI_DIST)
print("Box Size:", BOX_SIZE)
print("Box Volume:", BOX_VOL)

#Vertices parameters
vertices = np.zeros([POINTS_AMOUNT, 3], dtype=float)
colors = np.zeros([POINTS_AMOUNT, 3], dtype=float)
Trace = np.zeros((100, 3), dtype = float)

#### ATOMS-VERTICES COORD SYNC ####
def Atom2Vert(a):
    return a / BOX_SIZE - 0.5

def Vert2Atom(v):
    return (v + 0.5) * BOX_SIZE

def EvalVertices():
    for i in range(POINTS_AMOUNT):
        vertices[i] = np.matmul(MAT_LOOK_AT, Atom2Vert(R[i]))

#### SIMULATION FUNCTIONS DEFINING ####
def norma(r0, r1):
    if len(r0.shape) > 1: return lg.norm(r0 - r1, axis=1).reshape(r0.shape[0], 1)
    else : return lg.norm(r0 - r1, axis=0)

def expArg(r_ths, r_oth):
    return ALP * (norma(r_ths, r_oth) - RM) / 10**-10

def MorseU(r_ths, r_oth):
    u = (r_ths - r_oth) / (norma(r_ths, r_oth) + 10**-100) * EPS * (np.exp(-2 * expArg(r_ths, r_oth)) - 2 * np.exp(-expArg(r_ths, r_oth)))
    return u

def MorseDU(r_ths, r_oth):
    du = (r_ths - r_oth) / (norma(r_ths, r_oth) + 10**-100) * EPS * (-2 * np.exp(-2 * expArg(r_ths, r_oth)) + 2 * ALP * np.exp(-expArg(r_ths, r_oth)))
    return du

def MorseD2U(r_ths, r_oth):
    d2u = (r_ths - r_oth) / (norma(r_ths, r_oth) + 10**-100) * EPS * (4 * ALP ** 2 * np.exp(-2 *  expArg(r_ths, r_oth)) - 2 * ALP ** 2 * np.exp(-expArg(r_ths, r_oth)))
    return d2u

def Tension(i):
    elems = (MorseDU(R, np.array([R[i]] * POINTS_AMOUNT)) - MorseDU(R[i], R[i])) * np.prod(R[i]) / np.linalg.norm(R[i])
    sigma = 0.5 / BOX_VOL * np.sum(elems, axis=0)
    return sigma

def MidTension():
    res = np.zeros(3, dtype = float)
    for i in range(POINTS_AMOUNT):
        res += Tension(i)
    return res / POINTS_AMOUNT

def KineticAmount():
    return 0.5 * MAS * np.sum(lg.norm(V, axis=1) ** 2)
    
def EvalAtoms():
    accmem = 0
    k = TRACKING_POINT
    for i in range(POINTS_AMOUNT):
        acc = np.sum(MorseD2U(R, np.array([R[i]] * POINTS_AMOUNT)), axis=0)
        acc -= MorseD2U(R[i], R[i])
        if i == k: accmem = acc
        r_new = 2 * R[i] - R_prev[i] + acc * TAU ** 2 
        R_prev[i] = R[i]
        R[i] = r_new
        if R[i, 0] > BOX_SIZE or R[i, 0] < 0: R[i, 0], R_prev[i, 0] = R_prev[i, 0], R[i, 0]
        if R[i, 1] > BOX_SIZE or R[i, 1] < 0: R[i, 1], R_prev[i, 1] = R_prev[i, 1], R[i, 1]
        if R[i, 2] > BOX_SIZE or R[i, 2] < 0: R[i, 2], R_prev[i, 2] = R_prev[i, 2], R[i, 2]
        V[i] = R[i] - R_prev[i]
        
    global SIM_TIME
    global SIM_ITRS
    SIM_TIME += TAU
    SIM_ITRS += 1
    if SIM_ITRS % 100 == 0:
        tmp = np.mean(V ** 2, axis=0)
        global Trace
        print("Iteration No.", SIM_ITRS)
        print("Simulation time:", np.round(SIM_TIME, 4), "sec")
        print("Sum of speeds:", np.sum(V, axis=0))
        print("Mid Tension:", MidTension())
        print("Knetic Energy:", KineticAmount())
        print("ALPHA(T):", np.linalg.norm(tmp) / np.linalg.norm(tmp) ** 2)
        print("")
        print("R #", k, R[k])
        print("V #", k, V[k])
        print("A #", k, accmem)
        print("T #", k, Tension(k))
        Trace[:-1] = Trace[1:]
        Trace[-1] = Atom2Vert(np.array([[R[k, 0], R[k, 1], R[k, 2]]]))
        print("")
    
#### OPENGL FUNCTIONS DEFINING ####
def SetCameraPosition():
    global CAMERA_POSITION
    global MAT_LOOK_AT
    CAMERA_POSITION[0] = CAMERA_R * np.sin(CAMERA_THETA) * np.cos(CAMERA_PHI)
    CAMERA_POSITION[1] = CAMERA_R * np.sin(CAMERA_THETA) * np.sin(CAMERA_PHI)
    CAMERA_POSITION[2] = CAMERA_R * np.cos(CAMERA_THETA)
    CAMERA_DIRECTION = CAMERA_POSITION - CAMERA_TARGET / lg.norm(CAMERA_POSITION - CAMERA_TARGET)
    CAMERA_RIGHT = np.cross(CAMERA_DIRECTION, DIRECTION_UP) / lg.norm(np.cross(CAMERA_DIRECTION, DIRECTION_UP))
    CAMERA_UP = np.cross(CAMERA_DIRECTION, CAMERA_RIGHT) / lg.norm(np.cross(CAMERA_DIRECTION, CAMERA_RIGHT))
    MAT_LOOK_AT = np.matmul(np.hstack([np.vstack([CAMERA_RIGHT, CAMERA_UP, \
                                        CAMERA_DIRECTION, np.zeros(3)]), \
                             np.array([0, 0, 0, 1]).reshape(4,1)]), \
                  np.array([[1,0,0,-CAMERA_POSITION[0]],
                            [0,1,0,-CAMERA_POSITION[1]],
                            [0,0,1,-CAMERA_POSITION[2]],
                            [0,0,0,1]]))        
    MAT_LOOK_AT = MAT_LOOK_AT[:-1, :-1]
            
def PrepareView():
    gl.glViewport(0, 0, WINDOW_WIDTH, WINDOW_HEIGHT)
    gl.glMatrixMode(gl.GL_PROJECTION)
    gl.glLoadIdentity()
    gl.glOrtho(VIEW_ORTHO, -VIEW_ORTHO, VIEW_ORTHO, -VIEW_ORTHO, -2, 2)
    gl.glMatrixMode(gl.GL_MODELVIEW)
    gl.glLoadIdentity()
       
def DrawAtoms():
    gl.glPointSize(3.0)
    gl.glBegin(gl.GL_POINTS)
    for i in range(POINTS_AMOUNT):
       gl.glColor3f(colors[i, 0], colors[i, 1], colors[i, 2])
       gl.glVertex(vertices[i, 0], vertices[i, 1], vertices[i, 2])
    gl.glEnd()
    
def DrawTrace():
    gl.glColor3f(1, 1, 1)
    gl.glBegin(gl.GL_LINES)
    for i in range(2, Trace.shape[0]):
        point1 = np.matmul(MAT_LOOK_AT, Trace[i - 1])
        point2 = np.matmul(MAT_LOOK_AT, Trace[i])
        gl.glVertex(point1[0], point1[1], point1[2])
        gl.glVertex(point2[0], point2[1], point2[2])
    gl.glEnd()
    
def DrawBounds():
    gl.glColor3f(0, 1, 1)
    gl.glBegin(gl.GL_LINES)
    for i in range(12):
        point1 = np.matmul(MAT_LOOK_AT, CUBE_VERTICES[CUBE_INDICES[i, 0]])
        point2 = np.matmul(MAT_LOOK_AT, CUBE_VERTICES[CUBE_INDICES[i, 1]])
        gl.glVertex(point1[0], point1[1], point1[2])
        gl.glVertex(point2[0], point2[1], point2[2])
    gl.glEnd()
    
def DrawNav():
    gl.glBegin(gl.GL_LINES)
    for i in range(3):
        point1 = np.matmul(MAT_LOOK_AT, AXIS_VERTICES[AXIS_INDICES[i, 0]])
        point2 = np.matmul(MAT_LOOK_AT, AXIS_VERTICES[AXIS_INDICES[i, 1]])
        point1[0] -= VIEW_ORTHO / 1.2
        point2[0] -= VIEW_ORTHO / 1.2
        point1[1] += VIEW_ORTHO / 1.2
        point2[1] += VIEW_ORTHO / 1.2
        gl.glColor3f(AXIS_COLORS[i, 0], AXIS_COLORS[i, 1], AXIS_COLORS[i, 2])
        gl.glVertex(point1[0], point1[1], point1[2])
        gl.glVertex(point2[0], point2[1], point2[2])
    gl.glEnd()
    gl.glPointSize(7.0)
    gl.glBegin(gl.GL_POINTS)
    gl.glColor3f(0, 1, 1)
    point = np.matmul(MAT_LOOK_AT, AXIS_POINT)
    point[0] -= VIEW_ORTHO / 1.2
    point[1] += VIEW_ORTHO / 1.2
    gl.glVertex(point[0], point[1], point[2])
    gl.glEnd()
    

def ShowScreen():
    gl.glEnable(gl.GL_DEPTH_TEST)
    gl.glClear(gl.GL_COLOR_BUFFER_BIT | gl.GL_DEPTH_BUFFER_BIT)
    gl.glLoadIdentity()
    PrepareView()
    if flag_Emu:
        EvalAtoms()
    EvalVertices()
    if flag_ShowTrace:
        DrawTrace()
    DrawBounds()
    DrawNav()
    DrawAtoms()
    glut.glutSwapBuffers()
    if flag_Exit:
        glut.glutLeaveMainLoop()

def KeyboardHandler(key, x, y):
    global flag_Emu
    global flag_Exit
    global flag_ShowTrace
    if ord(key) == 13: flag_Emu = True
    elif ord(key) == ord('p'): flag_Emu = False
    elif ord(key) == ord('q'): flag_Exit = True
    elif ord(key) == ord('t'): flag_ShowTrace =  not flag_ShowTrace

def SpecialHandler(key, x, y):
    global CAMERA_THETA
    global CAMERA_PHI
    if key == glut.GLUT_KEY_DOWN: 
        if CAMERA_THETA <= np.pi - 0.2: CAMERA_THETA += np.pi / 24
    elif key == glut.GLUT_KEY_UP:
        if CAMERA_THETA >= 0.2: CAMERA_THETA -= np.pi / 24
    elif key == glut.GLUT_KEY_LEFT:
        CAMERA_PHI -= np.pi / 24
    elif key == glut.GLUT_KEY_RIGHT:
        CAMERA_PHI += np.pi / 24
    elif key == glut.GLUT_KEY_F1:
        CAMERA_PHI = np.pi / 4
        CAMERA_THETA = 2.186276
    elif key == glut.GLUT_KEY_F2:
        CAMERA_PHI = np.pi / 4
        CAMERA_THETA = np.pi / 2
    elif key == glut.GLUT_KEY_F3:
        CAMERA_PHI = 0
        CAMERA_THETA = np.pi / 2
    elif key == glut.GLUT_KEY_F4:
        CAMERA_PHI = np.pi / 6
        CAMERA_THETA = np.pi / 3
    SetCameraPosition()
    
#### START PROGRAMM ####
SetCameraPosition()
itr = 0
for i in range(GRID_SIZE):
    for j in range(GRID_SIZE):
        for k in range(GRID_SIZE):            
            R[itr, 0] = i * GRID_SIZE / (GRID_SIZE - 1) * INI_DIST + INI_PAD
            R[itr, 1] = j * GRID_SIZE / (GRID_SIZE - 1) * INI_DIST + INI_PAD
            R[itr, 2] = k * GRID_SIZE / (GRID_SIZE - 1) * INI_DIST + INI_PAD
            
            vertices[itr] = Atom2Vert(R[itr])
            
            colors[itr, 0] = 1 - i / GRID_SIZE
            colors[itr, 1] = (i + 1) / GRID_SIZE
            colors[itr, 2] = (j + 1) / GRID_SIZE     
            
            itr += 1

R_prev = R.copy()
delta = np.zeros(3, dtype=float)
for i in range(POINTS_AMOUNT - POINTS_AMOUNT % 2):
    if i % 2 == 0:
        delta[0] = (1 - 2 * np.random.rand()) * INI_SPD
        delta[1] = (1 - 2 * np.random.rand()) * INI_SPD
        delta[2] = (1 - 2 * np.random.rand()) * INI_SPD
        R_prev[i] += delta
    else: 
        R_prev[i] -= delta
    vertices[i] = np.matmul(MAT_LOOK_AT, vertices[i])

del delta
V = R - R_prev
Trace += Atom2Vert(R[TRACKING_POINT])
print("Initial Sum of speeds:", np.sum(V, axis=0))

print("")  
glut.glutInit()
glut.glutInitDisplayMode(glut.GLUT_RGBA)
glut.glutInitWindowSize(WINDOW_WIDTH, WINDOW_HEIGHT)
glut.glutInitWindowPosition(0, 0)
wind = glut.glutCreateWindow(b'OpenGL Window')
glut.glutDisplayFunc(ShowScreen)
glut.glutIdleFunc(ShowScreen)
glut.glutKeyboardFunc(KeyboardHandler)
glut.glutSpecialFunc(SpecialHandler)
glut.glutMainLoop()