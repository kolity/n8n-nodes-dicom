import type {
	IExecuteFunctions,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
} from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';

export class DicomNode implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'DICOM',
		name: 'dicomNode',
		group: ['transform'],
		version: 1,
		description: 'Process and analyze DICOM medical imaging files',
		defaults: {
			name: 'DICOM',
		},
		inputs: ['main'],
		outputs: ['main'],
		properties: [
			// Operation selection
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				noDataExpression: true,
				options: [
					{
						name: 'Extract Metadata',
						value: 'extractMetadata',
						description: 'Extract DICOM tags and metadata from the file',
						action: 'Extract DICOM metadata',
					},
					{
						name: 'Anonymize',
						value: 'anonymize',
						description: 'Remove or replace patient identifiable information',
						action: 'Anonymize DICOM file',
					},
					{
						name: 'Convert',
						value: 'convert',
						description: 'Convert DICOM to other formats (PNG, JPEG, etc.)',
						action: 'Convert DICOM file',
					},
					{
						name: 'Validate',
						value: 'validate',
						description: 'Validate DICOM file against standards',
						action: 'Validate DICOM file',
					},
				],
				default: 'extractMetadata',
			},

			// Extract Metadata operation fields
			{
				displayName: 'File Property Name',
				name: 'filePropertyName',
				type: 'string',
				default: 'data',
				required: true,
				description: 'Name of the binary property containing the DICOM file',
				displayOptions: {
					show: {
						operation: ['extractMetadata', 'anonymize', 'convert', 'validate'],
					},
				},
			},
			{
				displayName: 'Include Fields',
				name: 'includeFields',
				type: 'string',
				default: '',
				placeholder: 'PatientName,StudyDate,Modality',
				description: 'Comma-separated list of DICOM tags to include (empty = all)',
				displayOptions: {
					show: {
						operation: ['extractMetadata'],
					},
				},
			},
			{
				displayName: 'Include Pixel Data',
				name: 'includePixelData',
				type: 'boolean',
				default: false,
				description: 'Whether to include pixel data in the output (may be large)',
				displayOptions: {
					show: {
						operation: ['extractMetadata'],
					},
				},
			},

			// Anonymize operation fields
			{
				displayName: 'Anonymization Profile',
				name: 'anonymizationProfile',
				type: 'options',
				options: [
					{
						name: 'Basic',
						value: 'basic',
						description: 'Remove direct identifiers only',
					},
					{
						name: 'Full',
						value: 'full',
						description: 'Remove all potential identifying information',
					},
					{
						name: 'Custom',
						value: 'custom',
						description: 'Custom anonymization rules',
					},
				],
				default: 'basic',
				description: 'Preset anonymization level',
				displayOptions: {
					show: {
						operation: ['anonymize'],
					},
				},
			},
			{
				displayName: 'Custom Tag Rules',
				name: 'customTagRules',
				type: 'fixedCollection',
				placeholder: 'Add Rule',
				typeOptions: {
					multipleValues: true,
				},
				default: {},
				options: [
					{
						name: 'rules',
						displayName: 'Rules',
						values: [
							{
								displayName: 'Tag',
								name: 'tag',
								type: 'string',
								default: '',
								placeholder: '0010,0010',
								description: 'DICOM tag to modify (format: group,element)',
							},
							{
								displayName: 'Action',
								name: 'action',
								type: 'options',
								options: [
									{
										name: 'Remove',
										value: 'remove',
									},
									{
										name: 'Replace',
										value: 'replace',
									},
									{
										name: 'Keep',
										value: 'keep',
									},
								],
								default: 'replace',
							},
							{
								displayName: 'Replace Value',
								name: 'replaceValue',
								type: 'string',
								displayOptions: {
									show: {
										action: ['replace'],
									},
								},
								default: '',
								description: 'Value to replace the tag with',
							},
						],
					},
				],
				description: 'Custom rules for tag anonymization',
				displayOptions: {
					show: {
						operation: ['anonymize'],
						anonymizationProfile: ['custom'],
					},
				},
			},

			// Convert operation fields
			{
				displayName: 'Output Format',
				name: 'outputFormat',
				type: 'options',
				options: [
					{
						name: 'PNG',
						value: 'png',
					},
					{
						name: 'JPEG',
						value: 'jpeg',
					},
					{
						name: 'JSON',
						value: 'json',
					},
					{
						name: 'XML',
						value: 'xml',
					},
				],
				default: 'png',
				description: 'Format to convert the DICOM file to',
				displayOptions: {
					show: {
						operation: ['convert'],
					},
				},
			},
			{
				displayName: 'Quality',
				name: 'quality',
				type: 'number',
				typeOptions: {
					minValue: 1,
					maxValue: 100,
				},
				default: 90,
				description: 'Quality of output image (1-100)',
				displayOptions: {
					show: {
						operation: ['convert'],
						outputFormat: ['jpeg', 'png'],
					},
				},
			},
			{
				displayName: 'Window Center',
				name: 'windowCenter',
				type: 'number',
				default: -1,
				description: 'Window Center for image rendering (-1 = auto)',
				displayOptions: {
					show: {
						operation: ['convert'],
						outputFormat: ['jpeg', 'png'],
					},
				},
			},
			{
				displayName: 'Window Width',
				name: 'windowWidth',
				type: 'number',
				default: -1,
				description: 'Window Width for image rendering (-1 = auto)',
				displayOptions: {
					show: {
						operation: ['convert'],
						outputFormat: ['jpeg', 'png'],
					},
				},
			},

			// Validate operation fields
			{
				displayName: 'Validation Level',
				name: 'validationLevel',
				type: 'options',
				options: [
					{
						name: 'Basic',
						value: 'basic',
						description: 'Check file format and basic structure only',
					},
					{
						name: 'Standard',
						value: 'standard',
						description: 'Validate against DICOM standard',
					},
					{
						name: 'Strict',
						value: 'strict',
						description: 'Strict validation of all fields and values',
					},
				],
				default: 'standard',
				description: 'How strictly to validate the DICOM file',
				displayOptions: {
					show: {
						operation: ['validate'],
					},
				},
			},
		],
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();
		const returnData: INodeExecutionData[] = [];

		for (let itemIndex = 0; itemIndex < items.length; itemIndex++) {
			try {
				const operation = this.getNodeParameter('operation', itemIndex) as string;
				const filePropertyName = this.getNodeParameter('filePropertyName', itemIndex) as string;

				// Check if the file property exists
				const item = items[itemIndex];
				if (!item.binary?.[filePropertyName]) {
					throw new NodeOperationError(
						this.getNode(),
						`No binary data property "${filePropertyName}" exists on item!`,
						{ itemIndex },
					);
				}

				// Process based on operation
				if (operation === 'extractMetadata') {
					const includeFields = this.getNodeParameter('includeFields', itemIndex, '') as string;
					const includePixelData = this.getNodeParameter('includePixelData', itemIndex, false) as boolean;

					// Here you would use a DICOM library to extract the metadata
					// This is a placeholder for the actual implementation
					const metadata = await extractDicomMetadata(
						item.binary[filePropertyName],
						includeFields,
						includePixelData,
					);

					returnData.push({
						json: {
							...metadata,
							sourceFile: filePropertyName,
						},
						pairedItem: itemIndex,
					});
				} else if (operation === 'anonymize') {
					const anonymizationProfile = this.getNodeParameter('anonymizationProfile', itemIndex) as string;
					let customRules = {};

					if (anonymizationProfile === 'custom') {
						const tagRulesData = this.getNodeParameter('customTagRules', itemIndex, {}) as {
							rules?: Array<{ tag: string; action: string; replaceValue?: string }>;
						};
						customRules = tagRulesData.rules || [];
					}

					// Here you would implement the anonymization logic
					const anonymizedResult = await anonymizeDicom(
						item.binary[filePropertyName],
						anonymizationProfile,
						customRules,
					);

					returnData.push({
						json: {
							success: true,
							profile: anonymizationProfile,
							sourceFile: filePropertyName,
						},
						binary: {
							anonymized: anonymizedResult,
						},
						pairedItem: itemIndex,
					});
				} else if (operation === 'convert') {
					const outputFormat = this.getNodeParameter('outputFormat', itemIndex) as string;
					const options: Record<string, any> = {};

					if (outputFormat === 'jpeg' || outputFormat === 'png') {
						options.quality = this.getNodeParameter('quality', itemIndex) as number;
						options.windowCenter = this.getNodeParameter('windowCenter', itemIndex) as number;
						options.windowWidth = this.getNodeParameter('windowWidth', itemIndex) as number;
					}

					// Here you would implement the conversion logic
					const convertedResult = await convertDicom(
						item.binary[filePropertyName],
						outputFormat,
						options,
					);

					returnData.push({
						json: {
							success: true,
							format: outputFormat,
							sourceFile: filePropertyName,
						},
						binary: {
							converted: convertedResult,
						},
						pairedItem: itemIndex,
					});
				} else if (operation === 'validate') {
					const validationLevel = this.getNodeParameter('validationLevel', itemIndex) as string;

					// Here you would implement the validation logic
					const validationResult = await validateDicom(
						item.binary[filePropertyName],
						validationLevel,
					);

					returnData.push({
						json: {
							...validationResult,
							sourceFile: filePropertyName,
						},
						pairedItem: itemIndex,
					});
				}
			} catch (error) {
				if (this.continueOnFail()) {
					returnData.push({
						json: {
							error: error.message,
						},
						pairedItem: itemIndex,
					});
				} else {
					throw error;
				}
			}
		}

		return [returnData];
	}
}

// Helper functions (these would need actual implementations)

/**
 * Extract metadata from a DICOM file
 */
async function extractDicomMetadata(
	fileData: any,
	includeFields: string,
	includePixelData: boolean,
): Promise<any> {
	// Placeholder for implementation with a DICOM parsing library
	// You would need to use a library like dcmjs, cornerstone, or dicom-parser

	// Example implementation placeholder
	return {
		patientName: 'ANONYMOUS',
		studyDate: '20230101',
		modality: 'CT',
		// Additional metadata would be extracted here
	};
}

/**
 * Anonymize a DICOM file
 */
async function anonymizeDicom(
	fileData: any,
	profile: string,
	customRules: any,
): Promise<any> {
	// Placeholder for implementation
	// Return the anonymized file as binary data
	return {
		data: new Uint8Array([]), // Placeholder for actual anonymized data
		mimeType: 'application/dicom',
		fileName: 'anonymized.dcm',
	};
}

/**
 * Convert DICOM to another format
 */
async function convertDicom(
	fileData: any,
	format: string,
	options: Record<string, any>,
): Promise<any> {
	// Placeholder for implementation
	// Return the converted file as binary data
	let mimeType = 'application/octet-stream';
	if (format === 'png') mimeType = 'image/png';
	if (format === 'jpeg') mimeType = 'image/jpeg';
	if (format === 'json') mimeType = 'application/json';
	if (format === 'xml') mimeType = 'application/xml';

	return {
		data: new Uint8Array([]), // Placeholder for actual converted data
		mimeType,
		fileName: `converted.${format}`,
	};
}

/**
 * Validate a DICOM file
 */
async function validateDicom(
	fileData: any,
	level: string,
): Promise<any> {
	// Placeholder for implementation
	return {
		valid: true,
		errors: [],
		warnings: [],
		level,
	};
}