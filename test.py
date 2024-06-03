import numpy as np
import matplotlib.pyplot as plt
from mpl_toolkits.mplot3d.art3d import Poly3DCollection

def ggx_distribution(n, h, alpha):
    alphaSq = alpha ** 2
    nhDot = np.dot(n, h)
    step = 1 if nhDot > 0 else 0
    return step * alphaSq / (np.pi * (nhDot ** 2 * (alphaSq - 1) + 1) ** 2)

def ggx_distribution_cos(cos, alpha):
    alphaSq = alpha ** 2
    return alphaSq / (np.pi * (cos ** 2 * (alphaSq - 1) + 1) ** 2)

def ggx_sample(alpha):
    xi1, xi2 = np.random.random(2)
    # Compute theta using the inverted CDF
    cos_theta = np.sqrt((1.0 - xi1) / (1.0 + (alpha * alpha - 1.0) * xi1))
    sin_theta = np.sqrt(1.0 - cos_theta * cos_theta)
    
    # Compute phi
    phi = 2.0 * np.pi * xi2
    
    # Convert to Cartesian coordinates
    h_x = sin_theta * np.cos(phi)
    h_y = sin_theta * np.sin(phi)
    h_z = cos_theta
    
    return np.array([h_x, h_y, h_z])

def random_unit_vector():
    phi = np.random.uniform(0, 2 * np.pi)
    cosTheta = 1 - 2 * np.random.uniform(0, 1)
    sinTheta = (1 - cosTheta**2) ** (1/2)
    x = sinTheta * np.cos(phi)
    y = sinTheta * np.sin(phi)
    z = cosTheta
    return np.array([x, y, z])

def random_unit_vector_hemi(n):
    temp = random_unit_vector()
    if np.dot(n, temp) < 0:
        temp *= -1
    return temp

def monte_carlo_integration(samples, alpha):
    n = np.array([0, 0, 1])
    total = 0
    for _ in range(samples):
        h = random_unit_vector_hemi(n)
        total += ggx_distribution(n, h, alpha) * np.dot(n, h)
    return total / samples *  2 * np.pi

# alpha = 0.01
# num_samples = 10000
# integral = monte_carlo_integration(num_samples, alpha)
# print("Monte Carlo Integration Result:", integral)

# x = np.arange(0, np.pi / 2, 0.01)
# g = ggx_distribution_cos(np.cos(x), alpha)
# plt.plot(x, g)
# plt.show()

# n = random_unit_vector()
# vecs = np.array([random_unit_vector_hemi(n) for _ in range(100)])
# zeros = np.zeros([100, 3])
# vecs = np.concatenate([zeros, vecs], 1)
# fig = plt.figure()
# ax = fig.add_subplot(111, projection="3d")
# ax.set_xlim([-1, 1])
# ax.set_ylim([-1, 1])
# ax.set_zlim([-1, 1])
# for vec in vecs:
#     ax.quiver(*vec)
# ax.quiver(0, 0, 0, n[0], n[1], n[2], color = "red")
# plt.show()

alpha = 0.1
N = 100
n = random_unit_vector()
up = np.array([0, 0, 1])
t = np.cross(n, up)
t /= np.linalg.norm(t)
b = np.cross(t, n)
b /= np.linalg.norm(b)

vecs = np.array([ggx_sample(alpha) for _ in range(N)])
zeros = np.zeros([N, 3])
vecs = np.concatenate([zeros, vecs], 1)
fig = plt.figure()
ax = fig.add_subplot(111, projection="3d")
ax.set_xlim([-1, 1])
ax.set_ylim([-1, 1])
ax.set_zlim([-1, 1])
for vec in vecs:
    M = np.vstack([t, b, n]).T
    vec = M @ vec[3:]
    if np.dot(vec, n) < 0.001:
        raise Exception()
    ax.scatter(vec[0], vec[1], vec[2])
#     ax.quiver(*vec)
ax.quiver(0, 0, 0, t[0], t[1], t[2], color = "red")
ax.quiver(0, 0, 0, b[0], b[1], b[2], color = "green")
ax.quiver(0, 0, 0, n[0], n[1], n[2], color = "blue")
plt.show()