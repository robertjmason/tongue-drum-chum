import cv from '@techstark/opencv-js';

/**
 * Advanced tongue detection using OpenCV.js algorithms
 * Replaces manual computer vision with professional-grade detection
 */
export class OpenCVTongueDetector {
	constructor() {
		this.isReady = false;
		this.debugMode = true; // Keep for detailed logging during tuning
		this.initOpenCV();

		// Detection parameters - Extensively re-tuned based on debugging logs and image characteristics
		this.params = {
			// Canny edge detection
			cannyLow: 20, // Lowered to capture potentially weaker edges of tongues
			cannyHigh: 80, // Adjusted to be more permissive, but still distinct from low

			// Morphological operations
			kernelSize: 4, // Increased to better close gaps in contours and smooth edges, assuming they are broken

			// Contour filtering - CRITICAL adjustments based on observed `minArea` rejections
			minArea: 100, // Drastically reduced to allow actual tongue contours to pass this initial filter
			maxArea: 50000, // Adjusted slightly to ensure very large blobs are filtered if they appear
			minAspectRatio: 0.2, // Kept similar, allowing a wide range for varying tongue shapes
			maxAspectRatio: 7.0, // Increased slightly to account for elongated tongue shapes
			minSolidity: 0.4, // Lowered to be more forgiving for irregular or partially detected shapes
			// maxCircularity: 1.0, // Set to 1.0 (perfect circle) to be as permissive as possible for circularity
			// Tongues are not perfect circles, so we need a more flexible upper bound for circularity.
			maxCircularity: 1.0, // Adjusted based on typical tongue shapes, allowing for less than perfect circles
			minCircularity: 0.1, // Added a lower bound to filter out very irregular shapes

			// Bilateral filter - Slightly increased for robust noise reduction while preserving edges
			bilateralD: 11,
			bilateralSigmaColor: 90,
			bilateralSigmaSpace: 90
		};

		console.log('🔬 OpenCV Tongue Detector initialized with extensively re-tuned parameters.');
	}

	/**
	 * Initialize OpenCV.js - handles async loading
	 */
	async initOpenCV() {
		try {
			// Wait for OpenCV.js to be ready
			if (typeof cv === 'undefined') {
				console.log('⏳ Waiting for OpenCV.js to load...');
				await new Promise(resolve => {
					const checkCV = () => {
						if (typeof cv !== 'undefined' && cv.Mat) {
							resolve();
						} else {
							setTimeout(checkCV, 100);
						}
					};
					checkCV();
				});
			}

			this.isReady = true;
			console.log('✅ OpenCV.js ready for tongue detection');
		} catch (error) {
			console.error('❌ OpenCV.js initialization failed:', error);
		}
	}

	/**
	 * Main tongue detection pipeline using OpenCV.js
	 * @param {ImageData} imageData - Canvas image data
	 * @param {number} width - Image width
	 * @param {number} height - Image height
	 * @returns {Array} Array of detected tongue shapes with confidence scores
	 */
	async detectTongueWithOpenCV(imageData, width, height) {
		if (!this.isReady) {
			console.warn('⚠️ OpenCV.js not ready, falling back to basic detection');
			return [];
		}

		let src, gray, blur, edges, morphed;
		let contours, hierarchy;

		try {
			// 1. Convert ImageData to OpenCV Mat
			src = cv.matFromImageData(imageData);

			// 2. Convert to grayscale
			gray = new cv.Mat();
			cv.cvtColor(src, gray, cv.COLOR_RGBA2GRAY);

			// 3. Advanced noise reduction - Bilateral filter preserves edges better
			blur = new cv.Mat();
			cv.bilateralFilter(
				gray, blur,
				this.params.bilateralD,
				this.params.bilateralSigmaColor,
				this.params.bilateralSigmaSpace
			);

			// 4. Canny edge detection - superior for tongue boundaries
			edges = new cv.Mat();
			cv.Canny(blur, edges, this.params.cannyLow, this.params.cannyHigh);

			// 5. Morphological operations to clean up edges and fill gaps
			morphed = new cv.Mat();
			const kernel = cv.getStructuringElement(
				cv.MORPH_ELLIPSE,
				new cv.Size(this.params.kernelSize, this.params.kernelSize)
			);
			cv.morphologyEx(edges, morphed, cv.MORPH_CLOSE, kernel); // Close gaps
			kernel.delete();

			// 6. Find contours with hierarchy information, focusing on external contours
			contours = new cv.MatVector();
			hierarchy = new cv.Mat();
			cv.findContours(
				morphed,
				contours,
				hierarchy,
				cv.RETR_EXTERNAL, // Focus on primary tongue shapes, ignoring internal text/holes
				cv.CHAIN_APPROX_SIMPLE
			);

			// 7. Analyze and filter contours for tongue-like shapes
			const tongueShapes = this.filterTongueContours(contours);

			if (this.debugMode) {
				console.log(`🔍 OpenCV processed ${contours.size()} contours, found ${tongueShapes.length} tongue candidates`);
			}

			return tongueShapes;

		} catch (error) {
			console.error('🚨 OpenCV processing error:', error);
			return [];
		} finally {
			// Clean up OpenCV memory - critical to prevent leaks
			if (src) src.delete();
			if (gray) gray.delete();
			if (blur) blur.delete();
			if (edges) edges.delete();
			if (morphed) morphed.delete();
			if (contours) contours.delete();
			if (hierarchy) hierarchy.delete();
		}
	}

	/**
	 * Calculate confidence score for a given tongue candidate.
	 * @param {number} area - The area of the tongue contour.
	 * @param {number} aspectRatio - The aspect ratio of the tongue.
	 * @param {number} solidity - The solidity of the tongue shape.
	 * @param {number} circularity - The circularity of the tongue shape.
	 * @returns {number} Confidence score between 0 and 1.
	 */
	calculateTongueConfidence(area, aspectRatio, solidity, circularity) {
		let confidence = 0.3; // Lower base confidence, earned through properties

		// Aspect ratio score (ideal is between 1.2 and 4.0)
		if (aspectRatio > 1.2 && aspectRatio < 4.0) {
			confidence += 0.3;
		}

		// Solidity score (higher is better, ideal > 0.8)
		if (solidity > 0.8) {
			confidence += 0.2;
		} else if (solidity > 0.6) {
			confidence += 0.1;
		}

		// Circularity score (lower is often better for tongues, but not too low)
		if (circularity > 0.2 && circularity < 0.7) {
			confidence += 0.2;
		}

		// Area score
		if (area > 500 && area < 70000) {
		    confidence += 0.2
		}

		return Math.min(1.0, confidence);
	}

	/**
	 * Intelligent contour filtering for tongue-like shapes
	 * @param {cv.MatVector} contours - Detected contours from OpenCV
	 * @returns {Array} Filtered tongue candidate shapes with confidence scores
	 */
	filterTongueContours(contours) {
		const tongueShapes = [];

		for (let i = 0; i < contours.size(); i++) {
			let contour = null;
			let hull = null; // Declare hull outside try block for finally cleanup

			try {
				contour = contours.get(i);

				const area = cv.contourArea(contour);
				const perimeter = cv.arcLength(contour, true);

				// Debugging and immediate rejection for very small areas
				if (area < this.params.minArea) {
					if (this.debugMode && i < 20) console.log(`REJECTED (minArea): Contour ${i} area=${Math.round(area)}`);
					continue;
				}

				// Calculate geometric properties
				const boundingRect = cv.boundingRect(contour);
				// Avoid division by zero for aspect ratio
				const aspectRatio = (boundingRect.width === 0 || boundingRect.height === 0) ? 0 :
					Math.max(boundingRect.width, boundingRect.height) /
					Math.min(boundingRect.width, boundingRect.height);

				// Calculate solidity with proper memory management
				hull = new cv.Mat(); // Initialize hull here
				cv.convexHull(contour, hull);
				const hullArea = cv.contourArea(hull);
				const solidity = hullArea > 0 ? area / hullArea : 0; // Avoid division by zero

				// Circularity: 1.0 for a perfect circle using this formula
				const circularity = (perimeter === 0) ? 0 : 4 * Math.PI * area / (perimeter * perimeter);

				// Compactness: area relative to bounding box area
				const compactness = (boundingRect.width * boundingRect.height === 0) ? 0 : area / (boundingRect.width * boundingRect.height);

				// Tongue shape criteria - empirically tuned
				const criteria = {
					areaOk: area >= this.params.minArea && area <= this.params.maxArea,
					aspectRatioOk: aspectRatio >= this.params.minAspectRatio && aspectRatio <= this.params.maxAspectRatio,
					solidityOk: solidity >= this.params.minSolidity,
					circularityOk: circularity >= this.params.minCircularity && circularity <= this.params.maxCircularity, // Now with min and max
					compactnessOk: compactness > 0.3 // Adjusted slightly for more leniency in compactness
				};

				const isTongueCandidate = criteria.areaOk && criteria.aspectRatioOk &&
					criteria.solidityOk && criteria.circularityOk && criteria.compactnessOk;

				// Debug logging for first few contours to understand rejection reasons
				if (this.debugMode && i < 20) {
					console.log(`🔍 Contour ${i}: area=${Math.round(area)}, aspect=${aspectRatio.toFixed(2)}, solidity=${solidity.toFixed(2)}, circ=${circularity.toFixed(2)}, compact=${compactness.toFixed(2)} -> ${isTongueCandidate ? 'ACCEPTED' : 'REJECTED'}`);
				}

				if (isTongueCandidate) {
					const rect = cv.boundingRect(contour);
					const confidence = this.calculateTongueConfidence(area, aspectRatio, solidity, circularity);
					tongueShapes.push({
						confidence: confidence,
						centroid: {
							x: rect.x + rect.width / 2,
							y: rect.y + rect.height / 2
						},
						boundingRect: rect,
						properties: {
							area: area,
							aspectRatio: aspectRatio,
							solidity: solidity,
							circularity: circularity,
							compactness: compactness
						}
						// You might want to store the actual contour or a simplified approximation for drawing/interaction
						// contour: contour.clone() // Clone if you need to keep the Mat object, remember to delete it later
					});
				}
			} catch (e) {
				console.error(`Error processing contour ${i}:`, e);
			} finally {
				// Ensure memory cleanup for each contour's related Mats
				if (contour) contour.delete();
				if (hull) hull.delete();
			}
		}

		// Post-processing for potential merging of fragmented tongues or filtering overlapping ones
		// This can be a complex step, depending on how fragmented or overlapping the detections are.
		// For now, we return the filtered list, but this is an area for further refinement.
		return tongueShapes;
	}
}
