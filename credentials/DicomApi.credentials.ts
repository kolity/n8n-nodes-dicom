import {
	IAuthenticateGeneric,
	ICredentialTestRequest,
	ICredentialType,
	INodeProperties,
} from 'n8n-workflow';

export class DicomApi implements ICredentialType {
	name = 'dicomApi';
	displayName = 'DICOM Server API';
	documentationUrl = 'https://github.com/kolity/n8n-nodes-dicom';
	properties: INodeProperties[] = [
		// Basic DICOM server connection details
		{
			displayName: 'DICOM Server URL',
			name: 'serverUrl',
			type: 'string',
			default: '',
			placeholder: 'https://dicom-server.example.com',
			description: 'URL of the DICOM server',
			required: true,
		},
		{
			displayName: 'Port',
			name: 'port',
			type: 'number',
			default: 4242,
			description: 'Port of the DICOM server (typically 4242 for DICOM web)',
		},
		{
			displayName: 'Authentication',
			name: 'authentication',
			type: 'options',
			options: [
				{
					name: 'None',
					value: 'none',
				},
				{
					name: 'Basic Auth',
					value: 'basicAuth',
				},
				{
					name: 'OAuth2',
					value: 'oAuth2',
				},
				{
					name: 'API Key',
					value: 'apiKey',
				},
			],
			default: 'none',
		},
		// Basic Auth credentials
		{
			displayName: 'Username',
			name: 'username',
			type: 'string',
			default: '',
			displayOptions: {
				show: {
					authentication: ['basicAuth'],
				},
			},
		},
		{
			displayName: 'Password',
			name: 'password',
			type: 'string',
			typeOptions: {
				password: true,
			},
			default: '',
			displayOptions: {
				show: {
					authentication: ['basicAuth'],
				},
			},
		},
		// OAuth2 credentials
		{
			displayName: 'OAuth2 Token URL',
			name: 'oAuth2TokenUrl',
			type: 'string',
			default: '',
			displayOptions: {
				show: {
					authentication: ['oAuth2'],
				},
			},
		},
		{
			displayName: 'Client ID',
			name: 'clientId',
			type: 'string',
			default: '',
			displayOptions: {
				show: {
					authentication: ['oAuth2'],
				},
			},
		},
		{
			displayName: 'Client Secret',
			name: 'clientSecret',
			type: 'string',
			typeOptions: {
				password: true,
			},
			default: '',
			displayOptions: {
				show: {
					authentication: ['oAuth2'],
				},
			},
		},
		{
			displayName: 'Scope',
			name: 'scope',
			type: 'string',
			default: '',
			displayOptions: {
				show: {
					authentication: ['oAuth2'],
				},
			},
			description: 'Space-separated list of scopes',
		},
		// API Key
		{
			displayName: 'API Key Name',
			name: 'apiKeyName',
			type: 'string',
			typeOptions: { password: true },
			default: '',
			displayOptions: {
				show: {
					authentication: ['apiKey'],
				},
			},
			description: 'Name of the header or query parameter that contains the API key (e.g., "X-API-Key")',
		},
		{
			displayName: 'API Key',
			name: 'apiKeyValue',
			type: 'string',
			typeOptions: {
				password: true,
			},
			default: '',
			displayOptions: {
				show: {
					authentication: ['apiKey'],
				},
			},
		},
		{
			displayName: 'Send As',
			name: 'apiKeyLocation',
			type: 'options',
			options: [
				{
					name: 'Header',
					value: 'header',
				},
				{
					name: 'Query Parameter',
					value: 'queryParameter',
				},
			],
			default: 'header',
			displayOptions: {
				show: {
					authentication: ['apiKey'],
				},
			},
		},
		// Advanced settings
		{
			displayName: 'Advanced Options',
			name: 'advancedOptions',
			type: 'collection',
			placeholder: 'Add Option',
			default: {},
			options: [
				{
					displayName: 'Timeout',
					name: 'timeout',
					type: 'number',
					default: 10000,
					description: 'Request timeout in milliseconds',
				},
				{
					displayName: 'WADO URI Prefix',
					name: 'wadoUriPrefix',
					type: 'string',
					default: '/wado',
					description: 'URI prefix for WADO requests',
				},
				{
					displayName: 'DICOM Web Path',
					name: 'dicomWebPath',
					type: 'string',
					default: '/dicom-web',
					description: 'Path for DICOMweb requests',
				},
				{
					displayName: 'Skip Certificate Validation',
					name: 'allowUnauthorizedCerts',
					type: 'boolean',
					default: false,
					description: 'Skip SSL certificate validation (not recommended for production)',
				},
				{
					displayName: 'Access Token',
					name: 'accessToken',
					type: 'string',
					typeOptions: {
						password: true,
					},
					default: '',
					description: 'Manually provided access token (if not using other auth methods)',
				},
				{
					displayName: 'API Secret',
					name: 'apiSecret',
					type: 'string',
					typeOptions: {
						password: true,
					},
					default: '',
					description: 'Secret used for API authentication',
				},
			],
		},
	];

	authenticate: IAuthenticateGeneric = {
		type: 'generic',
		properties: {
			// Each authentication type will be handled differently
			auth: {
				// For basic auth
				username: '={{ $credentials.authentication === "basicAuth" ? $credentials.username : undefined }}',
				password: '={{ $credentials.authentication === "basicAuth" ? $credentials.password : undefined }}',
			},
			headers: {
				// For API key in header
				'={{ $credentials.authentication === "apiKey" && $credentials.apiKeyLocation === "header" ? $credentials.apiKeyName : undefined }}':
					'={{ $credentials.authentication === "apiKey" && $credentials.apiKeyLocation === "header" ? $credentials.apiKeyValue : undefined }}',
				// For OAuth2, the credential will be handled in the node itself
				'Authorization': '={{ $credentials.advancedOptions?.accessToken ? `Bearer ${$credentials.advancedOptions.accessToken}` : undefined }}',
			},
			qs: {
				// For API key in query string
				'={{ $credentials.authentication === "apiKey" && $credentials.apiKeyLocation === "queryParameter" ? $credentials.apiKeyName : undefined }}':
					'={{ $credentials.authentication === "apiKey" && $credentials.apiKeyLocation === "queryParameter" ? $credentials.apiKeyValue : undefined }}',
			},
		},
	};

	// Define test request to validate credentials
	test: ICredentialTestRequest = {
		request: {
			baseURL: '={{ $credentials.serverUrl }}',
			url: '={{ $credentials.advancedOptions?.dicomWebPath ? $credentials.advancedOptions.dicomWebPath : "/dicom-web" }}/studies',
			method: 'GET',
			skipSslCertificateValidation: '={{ $credentials.advancedOptions?.allowUnauthorizedCerts }}',
			timeout: 10000,
		},
	};
}