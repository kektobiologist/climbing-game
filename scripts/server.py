import paho.mqtt.client as mqtt
import numpy as np
import cv2
import json
# create mqtt client
client = mqtt.Client()
# connect to mqtt broker
client.connect("localhost", 1883, 60)

# read array M from M.txt
M = np.loadtxt('M.txt')
# print shape
# read game map from map.json
with open('map.json') as f:
    game_map = json.load(f)

# open video stream
cap = cv2.VideoCapture(0)
ret, frame = cap.read()
# clone frame to bg_frame
bg_frame = frame.copy()


def getTransformedCircle(circlePoint, circleRadius, M):
    # project the circle point using the affine transform matrix
    circlePoint = cv2.transform(np.array([[circlePoint]]), M)[0][0]
    # calculate the scale value of the transform M
    sX = np.sqrt(M[0][0]**2 + M[0][1]**2)
    sY = np.sqrt(M[1][0]**2 + M[1][1]**2)
    # scale the radius
    radius = circleRadius * (sX + sY) / 2
    return circlePoint, radius


# do some precomputation
transformed_map = [getTransformedCircle([e["x"], e["y"]], e["r"], M) for e in game_map]
# convert frame to grayscale
frame = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
masks = [np.zeros_like(frame) for e in transformed_map]
for ((circlePoint, radius), mask) in zip(transformed_map, masks):
    # draw the circle on mask
    cv2.circle(mask, (int(circlePoint[0]), int(circlePoint[1])), int(radius), (255), thickness=-1)
   
num_pixels = [np.count_nonzero(mask) for mask in masks]

while True:
    ret, frame = cap.read()
    # print frame size, bg_frame size
    if frame.shape != bg_frame.shape:
        continue
    # print(frame.shape, bg_frame.shape)
    # compute pixel wise difference of frame and bg_frame
    diff = cv2.absdiff(frame, bg_frame)
    # convert to grayscale
    gray = cv2.cvtColor(diff, cv2.COLOR_BGR2GRAY)
    # enumerate and iterate masks
    masked_images = [cv2.bitwise_and(gray, mask) for mask in masks]
    avg_vals = [0]* len(masked_images)
    for i, masked_image in enumerate(masked_images):
        # compute avg_val
        avg_vals[i] = np.sum(masked_image) / num_pixels[i]
        # draw the circle on gray as well, in white
        cv2.circle(gray, (int(transformed_map[i][0][0]), int(transformed_map[i][0][1])), int(transformed_map[i][1]), (255), thickness=2)
    # send avg_val over mqtt on channel "avg_val"
    # json encode it first
    # convert avg_vals to numpy array
    avg_vals = np.array(avg_vals)
    # create a key value dictionary with key as index, value as avg_val
    avg_vals = {i: avg_val for i, avg_val in enumerate(avg_vals)}
    json_encoded = json.dumps(avg_vals)
    client.publish("avg_vals", json_encoded)
    print(avg_vals)
    cv2.imshow("frame", gray)

    key = cv2.waitKey(1)

    # check enter key
    if key == 13:
        bg_frame = frame.copy()
    
    # check escape key
    if key == 27:
        break
    
