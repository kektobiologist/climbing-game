from PIL import Image
from pyapriltags import Detector

import cv2
import sys
import numpy as np
import os


at_detector = Detector(searchpath=['apriltags'],
                       families='tag36h11',
                       nthreads=1,
                       quad_decimate=1.0,
                       quad_sigma=0.0,
                       refine_edges=1,
                       decode_sharpening=0.25,
                       debug=0)

# open apriltag image from current directory. its a tag36h11 tag
img = Image.open('tag36_11_00000.png')
# resize image
# don't use bilinear or any other interpolation because it will blur the tag
tag_scale = 40
img = img.resize((10*tag_scale,10*tag_scale), Image.NEAREST)

# open the video stream
cap = cv2.VideoCapture(1)
frame = cap.read()[1]
frame_height, frame_width, channels = frame.shape
# get the size of the users desktop, probably 1920x1080
height, width = 1080, 1920
# create a black image of the same size
black = np.zeros((height, width, channels), dtype=np.uint8)
# convert to openCV image
black = Image.fromarray(black)
# add the apriltag to the black image at the center
black.paste(img, (int((width/2)- img.size[0]/2 ), int((height/2)- img.size[1]/2)))
# create a ROI on black that is the size of frame, centered
start_w = int((width/2)-(frame_width/2))
start_h = int((height/2)-(frame_height/2))
# convert black to opencv image
black = np.array(black)
roi_img = black[start_h:start_h+frame_height, start_w:start_w+frame_width]


reference_points = [
    [-4, 4],
    [4, 4],
    [4, -4],
    [-4, -4],
    [0, 0]
]
# multiply each number to scale the points
reference_points = np.array(reference_points) * tag_scale
# add the center of the image to each corner. center is height/2, width/2
reference_points = reference_points + np.array([width/2, height/2])


while True:
    # read current frame
    ret, frame = cap.read()
    if not ret:
        break


    # convert to grayscale
    gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)

    # detect apriltags in the image
    detections = at_detector.detect(gray)

    img_to_show = black
    if len(detections) != 0:
        det = detections[0]
        # print(det)
        # get the corners of the apriltag detection
        corners = det.corners
        center = det.center
        points = np.array(corners, dtype=np.int32)
        # append center to points
        points = np.append(points, np.array([center]), axis=0)

        # draw corners on frame
        for corner in corners:
            cv2.circle(frame, tuple(corner.astype(int)), 5, (0,0,255), -1)
        # compute approximate affine transform from points to reference_points
        # this will give us the transform matrix to map the points to the reference points
        print(points)
        print(reference_points)
        M = cv2.estimateAffinePartial2D(points, reference_points)[0]
        # create a black image the size of black
        black_copy = black.copy()
        # project the frame onto black_copy using the affine transform matrix
        black_copy = cv2.warpAffine(frame, M, (width, height), dst=black_copy, borderMode=cv2.BORDER_TRANSPARENT)
        # now blend the black_copy and the black image    
        # 5% frame, 95% black image
        alpha = 0.2
        blend = cv2.addWeighted(black_copy, alpha, black, 1-alpha, 0)
        img_to_show = blend
    # display the result
    cv2.imshow("Apriltag detection", img_to_show)

    # break the loop on 'q' key press
    if cv2.waitKey(1) & 0xFF == ord('q'):
        break

# release resources
cap.release()
cv2.destroyAllWindows()