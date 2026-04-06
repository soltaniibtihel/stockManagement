import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import ProductMovementDetailService from '../../services/productMovementDetailService';
import ProductMovementService from '../../services/productMovementService';
import { ArrowLeft } from 'lucide-react';

const ProductMovementDetailView = () => {
  const { id } = useParams(); // This is the movement ID
  const [detail, setDetail] = useState(null);
  const [movement, setMovement] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDetailData();
  }, [id]);

  const fetchDetailData = async () => {
    try {
      // Fetch movement to get basic info in case detail is empty
      const movRes = await ProductMovementService.getById(id);
      setMovement(movRes.data);

      try {
        const detailRes = await ProductMovementDetailService.getByMovementId(id);
        setDetail(detailRes.data);
      } catch (e) {
        setDetail(null); // No detail found
      }
    } catch (error) {
      console.error('Error fetching movement data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div>Loading...</div>;
  if (!movement) return <div>Movement not found!</div>;

  return (
    <div>
      <div className="page-title" style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
        <Link to="/product-movements" className="btn btn-secondary">
          <ArrowLeft size={18} /> Back
        </Link>
        Product Movement Detail
      </div>

      <div className="card">
        <h3>Basic Movement Information</h3>
        <table className="details-table" style={{ width: '100%', marginBottom: '2rem', textAlign: 'left' }}>
          <tbody>
            <tr>
              <th style={{ width: '200px' }}>Movement ID:</th>
              <td>{movement.id}</td>
            </tr>
            <tr>
              <th>Product Code:</th>
              <td><span className="badge badge-blue">{movement.product?.code}</span></td>
            </tr>
            <tr>
              <th>Product Name:</th>
              <td>{movement.product?.name}</td>
            </tr>
            <tr>
              <th>Movement Type:</th>
              <td>{movement.type}</td>
            </tr>
            <tr>
              <th>Quantity:</th>
              <td>{movement.quantity}</td>
            </tr>
            <tr>
              <th>Date:</th>
              <td>{movement.date}</td>
            </tr>
          </tbody>
        </table>

        <h3>Financial Details</h3>
        <table className="details-table" style={{ width: '100%', textAlign: 'left' }}>
          <tbody>
            <tr>
              <th style={{ width: '200px' }}>Unit Price:</th>
              <td>{detail && detail.unitPrice !== null ? detail.unitPrice : 'N/A'}</td>
            </tr>
            <tr>
              <th>Total Price:</th>
              <td>{detail && detail.totalPrice !== null ? detail.totalPrice : 'N/A'}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default ProductMovementDetailView;
