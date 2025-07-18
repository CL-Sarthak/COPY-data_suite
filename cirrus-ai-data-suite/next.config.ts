import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  webpack: (config, { isServer, webpack }) => {
    // Exclude unnecessary database drivers and React Native dependencies
    config.externals = config.externals || [];
    
    if (isServer) {
      config.externals.push(
        'react-native-sqlite-storage',
        '@sap/hana-client',
        'mysql',
        'mysql2',
        'oracledb',
        'pg',
        'pg-native',
        'sqlite3',
        'tedious',
        'typeorm-aurora-data-api-driver'
      );
    }

    // Suppress TypeORM warnings
    config.plugins = config.plugins || [];
    config.plugins.push(
      new webpack.IgnorePlugin({
        resourceRegExp: /^app-root-path$/,
      }),
      new webpack.IgnorePlugin({
        resourceRegExp: /@sap\/hana-client/,
      }),
      new webpack.IgnorePlugin({
        resourceRegExp: /^react-native-sqlite-storage$/,
      })
    );


    // Add webpack aliases for TypeORM to work in serverless
    config.resolve = {
      ...config.resolve,
      alias: {
        ...config.resolve?.alias,
        // Ensure TypeORM can find entities in production
        '@/entities': isServer ? './src/entities' : '../src/entities',
      }
    };

    // Ensure decorators are not stripped in production
    config.optimization = {
      ...config.optimization,
      // Keep class names for TypeORM entity resolution
      minimizer: config.optimization?.minimizer?.map((minimizer: any) => {
        if (minimizer.constructor.name === 'TerserPlugin') {
          minimizer.options.terserOptions = {
            ...minimizer.options.terserOptions,
            keep_classnames: true,
            keep_fnames: true,
          };
        }
        return minimizer;
      })
    };

    return config;
  },
  
  // External packages for server components
  // NOTE: TypeORM needs to be external to avoid module resolution issues during build
  serverExternalPackages: ['better-sqlite3', 'app-root-path', 'typeorm']
};

export default nextConfig;
